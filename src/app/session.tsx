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
import { useRunStore } from '@/stores/useRunStore';
import { confirmDestructive, notify } from '@/utils/dialog';
import { formatClock, formatSigned } from '@/utils/time';

const SEGMENTS = 10;
const DANGER_RATIO = 0.2;

const AWAY_FAIL_MESSAGE = '자리를 30초 이상 비워서 이 태스크는 미완주로 남았어요.';

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

  // 이탈 감지: 백그라운드 전환 시각을 기록하고, 복귀(또는 재실행) 시 유예 초과면 미완주 처리
  useEffect(() => {
    if (!hydrated) return;
    const store = useRunStore.getState();
    if (store.resolveAway() === 'failed') notify('이탈 감지', AWAY_FAIL_MESSAGE);
    const sub = AppState.addEventListener('change', (next) => {
      const current = useRunStore.getState();
      if (next === 'active') {
        if (current.resolveAway() === 'failed') notify('이탈 감지', AWAY_FAIL_MESSAGE);
      } else if (next === 'background' || next === 'inactive') {
        current.markAway();
      }
    });
    return () => sub.remove();
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
