import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRunStore } from '@/stores/useRunStore';
import { formatClock, formatSigned } from '@/utils/time';

const SEGMENTS = 10;
const DANGER_RATIO = 0.2;

export default function SessionScreen() {
  const hydrated = useRunStore((s) => s.hydrated);
  const tasks = useRunStore((s) => s.tasks);
  const currentIndex = useRunStore((s) => s.currentIndex);
  const endAt = useRunStore((s) => s.endAt);
  const combo = useRunStore((s) => s.combo);
  const completeCurrent = useRunStore((s) => s.completeCurrent);
  const giveUpCurrent = useRunStore((s) => s.giveUpCurrent);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (hydrated && currentIndex === null) router.replace('/result');
  }, [hydrated, currentIndex]);

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeCurrent();
  };

  const giveUp = () => {
    Alert.alert('포기할까요?', '콤보가 끊기고 이 태스크는 기록 없음(DNF) 처리돼요.', [
      { text: '계속하기', style: 'cancel' },
      {
        text: '포기',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          giveUpCurrent();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      {/* SafeAreaView는 inset을 인라인 padding으로 덮어쓰므로 레이아웃 패딩은 내부 View에 */}
      <View className="flex-1 items-center px-6">
      <View className="mt-6 border border-racing px-3 py-1" style={{ transform: [{ skewX: '-10deg' }] }}>
        <Text
          className="font-digitbold text-sm text-racing"
          style={{ transform: [{ skewX: '10deg' }] }}>
          STAGE {doneCount + 1}/{tasks.length}
        </Text>
      </View>

      <Text className="mt-3 text-[15px] text-ink">{task.title}</Text>

      <View className="flex-1 items-center justify-center">
        <Text
          className={`font-digitbold text-[88px] leading-none ${
            inDanger ? 'text-racing' : 'text-ink'
          }`}>
          {formatSigned(remainingSeconds)}
        </Text>
        <Text className="mt-2 font-digit text-sm text-ink-mute">
          BET {formatClock(task.betSeconds)}
        </Text>

        <View className="mt-8 w-64 flex-row gap-1">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <View
              key={i}
              className={`h-2 flex-1 ${i < filledSegments ? 'bg-racing' : 'bg-track'}`}
              style={{ transform: [{ skewX: '-20deg' }] }}
            />
          ))}
        </View>

        {combo > 0 && (
          <Text className="mt-5 font-digitbold text-lg text-racing">COMBO ×{combo}</Text>
        )}
      </View>

      <View className="w-full items-center gap-3 pb-6">
        <Pressable
          className="w-full items-center rounded-2xl border border-ink py-4 active:bg-track"
          onPress={complete}>
          <Text className="text-[15px] font-medium text-ink">완료</Text>
        </Pressable>
        <Pressable onPress={giveUp} hitSlop={8}>
          <Text className="text-[13px] text-ink-mute">포기하기</Text>
        </Pressable>
      </View>
      </View>
    </SafeAreaView>
  );
}
