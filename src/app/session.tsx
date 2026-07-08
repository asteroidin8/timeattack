import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  cancelSessionNotification,
  ensureNotificationSetup,
  scheduleSessionEndNotification,
} from '@/services/notifications';
import { subscribeScreenState } from '@/services/screenState';
import { useRunStore } from '@/stores/useRunStore';
import { confirmDestructive, notify } from '@/utils/dialog';
import { formatClock, formatSigned } from '@/utils/time';

const SEGMENTS = 10;
const DANGER_RATIO = 0.2;

// 이 시간 이상 차감되면 복귀 시 안내 (짧은 이탈은 조용히 차감만)
const DEDUCT_NOTIFY_THRESHOLD_SECONDS = 60;

export default function SessionScreen() {
  // 세션 중 화면 자동 꺼짐 방지 — 꺼짐이 background로 잡혀 이탈 미완주 처리되는 것 차단
  useKeepAwake();

  const hydrated = useRunStore((s) => s.hydrated);
  const tasks = useRunStore((s) => s.tasks);
  const currentIndex = useRunStore((s) => s.currentIndex);
  const endAt = useRunStore((s) => s.endAt);
  const combo = useRunStore((s) => s.combo);
  const completeCurrent = useRunStore((s) => s.completeCurrent);
  const giveUpCurrent = useRunStore((s) => s.giveUpCurrent);

  const [now, setNow] = useState(() => Date.now());
  const notificationId = useRef<string | null>(null);
  const lastCompleteAt = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (hydrated && currentIndex === null) router.replace('/result');
  }, [hydrated, currentIndex]);

  // 이탈 회계: 잠금은 집중 인정, 다른 앱에 간 시간만 차감 (실패 없음 — domain/away.ts)
  useEffect(() => {
    if (!hydrated) return;
    const notifyDeduction = (seconds: number) => {
      if (seconds >= DEDUCT_NOTIFY_THRESHOLD_SECONDS) {
        notify('자리 비움', `${formatClock(seconds)} 동안 자리를 비워 집중 시간에서 제외했어요.`);
      }
    };
    // 앱 재실행 복귀(킬 폴백 포함) 정산
    notifyDeduction(useRunStore.getState().settleAway());

    const appStateSub = AppState.addEventListener('change', (next) => {
      const store = useRunStore.getState();
      if (next === 'active') {
        notifyDeduction(store.settleAway());
      } else if (next === 'background' || next === 'inactive') {
        store.markAway();
      }
    });
    // 네이티브 잠금 이벤트 (웹/Expo Go는 no-op → 전부 차감 폴백)
    const unsubscribeScreen = subscribeScreenState((state) => {
      useRunStore.getState().handleScreenEvent(state);
    });
    return () => {
      appStateSub.remove();
      unsubscribeScreen();
    };
  }, [hydrated]);

  // 태스크가 바뀔 때마다 종료 알림을 다시 예약 (네이티브 전용, 웹은 no-op)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await cancelSessionNotification(notificationId.current);
      notificationId.current = null;
      if (currentIndex === null || endAt === null) return;
      const task = useRunStore.getState().tasks[currentIndex];
      if (!task) return;
      const granted = await ensureNotificationSetup();
      if (!granted || cancelled) return;
      notificationId.current = await scheduleSessionEndNotification(task.title, endAt);
    })();
    return () => {
      cancelled = true;
      cancelSessionNotification(notificationId.current);
      notificationId.current = null;
    };
  }, [currentIndex, endAt]);

  if (!hydrated || currentIndex === null || endAt === null) return null;

  const task = tasks[currentIndex];
  const doneCount = tasks.filter((t) => t.status !== 'pending').length;
  const remainingSeconds = Math.round((endAt - now) / 1000);
  const elapsedSeconds = task.betSeconds - remainingSeconds;
  const filledSegments = Math.min(
    SEGMENTS,
    Math.max(0, Math.floor((elapsedSeconds / task.betSeconds) * SEGMENTS)),
  );
  const inDanger = remainingSeconds <= task.betSeconds * DANGER_RATIO;

  const complete = () => {
    // 연타 가드 — 전환 직후 다음 태스크까지 완료되는 것 방지
    const nowMs = Date.now();
    if (nowMs - lastCompleteAt.current < 400) return;
    lastCompleteAt.current = nowMs;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeCurrent();
  };

  const giveUp = () => {
    confirmDestructive({
      title: '포기할까요?',
      message: '콤보가 끊기고 이 태스크는 미완주로 남아요.',
      confirmLabel: '포기',
      onConfirm: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        giveUpCurrent();
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      {/* SafeAreaView는 inset을 인라인 padding으로 덮어쓰므로 레이아웃 패딩은 내부 View에 */}
      <View className="flex-1 items-center px-6">
      <View className="mt-6 border border-racing px-4 py-1.5" style={{ transform: [{ skewX: '-10deg' }] }}>
        <Text
          className="font-digitbold text-lg text-racing"
          style={{ transform: [{ skewX: '10deg' }] }}>
          STAGE {doneCount + 1}/{tasks.length}
        </Text>
      </View>

      <Text className="mt-4 text-[18px] text-ink">{task.title}</Text>

      <View className="flex-1 items-center justify-center">
        <Text
          className={`font-digitbold text-[100px] leading-none ${
            inDanger ? 'text-racing' : 'text-ink'
          }`}>
          {formatSigned(remainingSeconds)}
        </Text>
        <Text className="mt-3 font-digit text-lg text-ink-mute">
          BET {formatClock(task.betSeconds)}
        </Text>

        <View className="mt-9 w-72 flex-row gap-1">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <View
              key={i}
              className={`h-2.5 flex-1 ${i < filledSegments ? 'bg-racing' : 'bg-track'}`}
              style={{ transform: [{ skewX: '-20deg' }] }}
            />
          ))}
        </View>

        {combo > 0 && (
          <Text className="mt-6 font-digitbold text-2xl text-racing">COMBO ×{combo}</Text>
        )}
      </View>

      <View className="w-full items-center gap-3 pb-6">
        <Pressable
          className="w-full items-center rounded-2xl border border-ink py-5 active:bg-track"
          onPress={complete}>
          <Text className="text-[18px] font-medium text-ink">완료</Text>
        </Pressable>
        <Pressable onPress={giveUp} hitSlop={8}>
          <Text className="text-[15px] text-ink-mute">포기하기</Text>
        </Pressable>
      </View>
      </View>
    </SafeAreaView>
  );
}
