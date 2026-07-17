import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  cancelSessionNotification,
  ensureNotificationSetup,
  scheduleOvertimeReminderNotification,
  scheduleSessionEndNotification,
} from '@/services/notifications';
import { subscribeScreenState } from '@/services/screenState';
import { useRunStore } from '@/stores/useRunStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { confirmDestructive, notify } from '@/utils/dialog';
import { formatClock, formatSigned } from '@/utils/time';

const SEGMENTS = 10;
const DANGER_RATIO = 0.2;

// 이 시간 이상 차감되면 복귀 시 안내 (짧은 이탈은 조용히 차감만)
const DEDUCT_NOTIFY_THRESHOLD_SECONDS = 60;

// 절전 화면(V1-4): 무터치 30초 후 어두운 미니멀 타이머로 전환 (keep-awake로 화면이 항상 켜져 있어 OLED 배려)
const AOD_IDLE_MS = 30_000;

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
  const sessionAlarmEnabled = useSettingsStore((s) => s.sessionAlarmEnabled);

  const [now, setNow] = useState(() => Date.now());
  // 세션당 알림 2개(타임 오버 + 초과 리마인더) — 함께 예약, 함께 취소
  const endNotificationId = useRef<string | null>(null);
  const overtimeNotificationId = useRef<string | null>(null);
  const lastCompleteAt = useRef(0);
  // 절전 화면
  const [dimmed, setDimmed] = useState(false);
  const lastTouchAt = useRef(Date.now());

  const wake = () => {
    lastTouchAt.current = Date.now();
    setDimmed(false);
  };

  // 방치 방어: now ≥ startedAt + 2×betSeconds면 그 시점까지만 캡해 자동 정산
  const checkAutoSettle = () => {
    const settledTitle = useRunStore.getState().autoSettleOverdue();
    if (settledTitle) {
      notify(
        '자동 정산',
        `"${settledTitle}" — 오래 초과되어 베팅의 2배 시점까지만 기록했어요.`,
      );
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      checkAutoSettle();
      setNow(Date.now());
      // 절전 전환: 설정 on + 무터치 30초 (끄면 즉시 해제)
      if (useSettingsStore.getState().aodEnabled) {
        if (Date.now() - lastTouchAt.current >= AOD_IDLE_MS) setDimmed(true);
      } else {
        setDimmed(false);
      }
    }, 250);
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
    // 앱 재실행 복귀(킬 폴백 포함) 정산 — away를 먼저 정산한 뒤 캡을 적용해야 하므로 순서 유지
    notifyDeduction(useRunStore.getState().settleAway());
    checkAutoSettle();

    const appStateSub = AppState.addEventListener('change', (next) => {
      const store = useRunStore.getState();
      if (next === 'active') {
        notifyDeduction(store.settleAway());
        checkAutoSettle();
        wake();
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

  // 태스크가 바뀔 때마다 종료 알림 + 초과 리마인더를 함께 다시 예약 (네이티브 전용, 웹은 no-op)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        cancelSessionNotification(endNotificationId.current),
        cancelSessionNotification(overtimeNotificationId.current),
      ]);
      endNotificationId.current = null;
      overtimeNotificationId.current = null;
      if (currentIndex === null || endAt === null) return;
      // 설정에서 세션 알림을 끄면 두 알림 모두 예약하지 않는다 (취소는 위에서 이미 수행)
      if (!sessionAlarmEnabled) return;
      const task = useRunStore.getState().tasks[currentIndex];
      if (!task) return;
      const granted = await ensureNotificationSetup();
      if (!granted || cancelled) return;
      endNotificationId.current = await scheduleSessionEndNotification(task.title, endAt);
      overtimeNotificationId.current = await scheduleOvertimeReminderNotification(
        task.title,
        endAt,
        task.betSeconds,
      );
    })();
    return () => {
      cancelled = true;
      cancelSessionNotification(endNotificationId.current);
      cancelSessionNotification(overtimeNotificationId.current);
      endNotificationId.current = null;
      overtimeNotificationId.current = null;
    };
  }, [currentIndex, endAt, sessionAlarmEnabled]);

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

  // 절전 뷰 — 잉크 배경에 타이머만. 탭하면 복귀 (다크는 이 화면 한정 의도적 예외)
  if (dimmed) {
    return (
      <Pressable className="flex-1 items-center justify-center bg-ink" onPress={wake}>
        <Text className="text-[16px] text-ink-mute">{task.title}</Text>
        <Text
          className={`mt-4 font-digitbold text-[88px] leading-none ${
            inDanger ? 'text-racing' : 'text-paper'
          }`}>
          {formatSigned(remainingSeconds)}
        </Text>
        <Text className="mt-6 text-[13px] text-ink-mute">탭하면 돌아가요</Text>
      </Pressable>
    );
  }

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
      <View
        className="flex-1 items-center px-6"
        onTouchStart={() => {
          lastTouchAt.current = Date.now();
        }}>
      <View className="mt-6 border border-racing px-4 py-1.5" style={{ transform: [{ skewX: '-10deg' }] }}>
        <Text
          className="font-digitbold text-lg text-racing"
          style={{ transform: [{ skewX: '10deg' }] }}>
          STAGE {doneCount + 1}/{tasks.length}
        </Text>
      </View>

      <Text className="mt-4 text-[18px] text-ink">{task.title}</Text>
      {task.parallel && (
        <Text className="mt-1 text-[13px] text-ink-mute">다른 앱 허용 — 이탈 차감 없음</Text>
      )}

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
