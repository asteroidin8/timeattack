import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { streakDays } from '@/domain/progress';
import { Importance, levelForXp } from '@/domain/xp';
import { useProgressStore } from '@/stores/useProgressStore';
import { useRunStore } from '@/stores/useRunStore';
import { notify } from '@/utils/dialog';
import { formatClock } from '@/utils/time';

const BET_PRESETS = [15, 25, 50];

function Chevrons({ level }: { level: Importance }) {
  return (
    <Text className="font-digitbold text-xs tracking-[2px]">
      <Text className="text-racing">{'›'.repeat(level)}</Text>
      <Text className="text-ink-faint">{'›'.repeat(3 - level)}</Text>
    </Text>
  );
}

export default function PlanningScreen() {
  const tasks = useRunStore((s) => s.tasks);
  const addTask = useRunStore((s) => s.addTask);
  const removeTask = useRunStore((s) => s.removeTask);
  const startRun = useRunStore((s) => s.startRun);
  const currentIndex = useRunStore((s) => s.currentIndex);
  const hydrated = useRunStore((s) => s.hydrated);
  const records = useProgressStore((s) => s.records);
  const totalXp = useProgressStore((s) => s.totalXp);

  // 앱 재시작 시 진행 중이던 런이 있으면 세션으로 복귀 (타이머는 endAt 기준이라 그대로 이어짐)
  useEffect(() => {
    if (hydrated && currentIndex !== null) router.replace('/session');
  }, [hydrated, currentIndex]);

  const day = streakDays(records, new Date());
  const level = levelForXp(totalXp);

  const [title, setTitle] = useState('');
  const [importance, setImportance] = useState<Importance>(2);
  const [betIndex, setBetIndex] = useState(1);

  const pending = tasks.filter((t) => t.status === 'pending');
  const totalBetSeconds = pending.reduce((sum, t) => sum + t.betSeconds, 0);

  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const submitTask = () => {
    addTask(title, importance, BET_PRESETS[betIndex]);
    setTitle('');
  };

  const start = () => {
    if (!startRun()) {
      notify('할 일이 없어요', '먼저 오늘의 태스크를 추가해 주세요.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/session');
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      {/* SafeAreaView는 inset을 인라인 padding으로 덮어쓰므로 레이아웃 패딩은 내부 View에 */}
      <View className="flex-1 px-6">
      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-[13px] text-ink-mute">{today}</Text>
          <Text className="mt-1 text-2xl font-medium text-ink">오늘의 스테이지</Text>
        </View>
        <Text className="font-digitbold text-base text-racing">
          LV {level} · DAY {day}
        </Text>
      </View>

      <FlatList
        className="mt-5"
        data={pending}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View className="h-[0.5px] bg-hairline" />}
        renderItem={({ item }) => (
          <Pressable
            className="flex-row items-center justify-between py-3"
            onLongPress={() => removeTask(item.id)}>
            <View>
              <Text className="text-[15px] text-ink">{item.title}</Text>
              <View className="mt-1">
                <Chevrons level={item.importance} />
              </View>
            </View>
            <Text className="font-digit text-xl text-ink">
              {formatClock(item.betSeconds)}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text className="py-10 text-center text-[13px] text-ink-mute">
            아래에서 첫 태스크를 추가해 보세요
          </Text>
        }
        ListFooterComponent={<View className="h-[0.5px] bg-hairline" />}
      />

      <View className="flex-row items-center gap-2 border-t-[0.5px] border-hairline py-3">
        <TextInput
          className="h-11 flex-1 rounded-lg bg-track px-3 text-[14px] text-ink"
          placeholder="할 일 추가"
          placeholderTextColor="#A6A69E"
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={submitTask}
          returnKeyType="done"
        />
        <Pressable
          className="h-11 items-center justify-center rounded-lg bg-track px-3"
          onPress={() => setImportance((prev) => ((prev % 3) + 1) as Importance)}>
          <Chevrons level={importance} />
        </Pressable>
        <Pressable
          className="h-11 items-center justify-center rounded-lg bg-track px-3"
          onPress={() => setBetIndex((prev) => (prev + 1) % BET_PRESETS.length)}>
          <Text className="font-digit text-base text-ink">{BET_PRESETS[betIndex]}′</Text>
        </Pressable>
        <Pressable
          className="h-11 w-11 items-center justify-center rounded-lg bg-ink"
          onPress={submitTask}>
          <Text className="text-lg text-paper">＋</Text>
        </Pressable>
      </View>

      <View className="pb-4">
        <Text className="mb-3 text-center font-digit text-sm text-ink-mute">
          {pending.length} TASKS · {formatClock(totalBetSeconds)}
        </Text>
        <Pressable
          className="items-center rounded-2xl bg-racing py-4 active:opacity-80"
          onPress={start}>
          <Text className="text-[15px] font-medium text-white">타임어택 시작 ›››</Text>
        </Pressable>
      </View>
      </View>
    </SafeAreaView>
  );
}
