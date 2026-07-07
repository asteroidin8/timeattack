import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditTaskSheet } from '@/components/EditTaskSheet';
import { streakDays } from '@/domain/progress';
import { Importance, levelForXp, RunTask } from '@/domain/xp';
import { ensureNotificationSetup } from '@/services/notifications';
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
  const updateTask = useRunStore((s) => s.updateTask);
  const removeTask = useRunStore((s) => s.removeTask);
  const reorderTasks = useRunStore((s) => s.reorderTasks);
  const startRun = useRunStore((s) => s.startRun);
  const rolloverIfNeeded = useRunStore((s) => s.rolloverIfNeeded);
  const currentIndex = useRunStore((s) => s.currentIndex);
  const hydrated = useRunStore((s) => s.hydrated);
  const onboarded = useRunStore((s) => s.onboarded);
  const records = useProgressStore((s) => s.records);
  const totalXp = useProgressStore((s) => s.totalXp);

  const [title, setTitle] = useState('');
  const [importance, setImportance] = useState<Importance>(2);
  const [betIndex, setBetIndex] = useState(1);
  const [editingTask, setEditingTask] = useState<RunTask | null>(null);

  // 첫 실행이면 온보딩으로, 진행 중이던 런이 있으면 세션으로 복귀 (endAt 기준이라 타이머 이어짐)
  useEffect(() => {
    if (!hydrated) return;
    if (!onboarded) {
      router.replace('/onboarding');
      return;
    }
    if (currentIndex !== null) router.replace('/session');
  }, [hydrated, onboarded, currentIndex]);

  // 날짜가 바뀌면 어제의 완료/포기 태스크를 정리하고 새 스테이지로
  useEffect(() => {
    if (!hydrated) return;
    rolloverIfNeeded();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') rolloverIfNeeded();
    });
    return () => sub.remove();
  }, [hydrated, rolloverIfNeeded]);

  const pending = tasks.filter((t) => t.status === 'pending');
  const totalBetSeconds = pending.reduce((sum, t) => sum + t.betSeconds, 0);
  const day = streakDays(records, new Date());
  const level = levelForXp(totalXp);

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
    ensureNotificationSetup();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/session');
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      {/* 하단 입력바가 키보드에 가려지지 않도록 화면 전체를 KeyboardAvoidingView로 감쌈 */}
      <KeyboardAvoidingView
        className="flex-1 px-6"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-[13px] text-ink-mute">{today}</Text>
          <Text className="mt-1 text-2xl font-medium text-ink">오늘의 스테이지</Text>
        </View>
        <Pressable onPress={() => router.push('/stats')} hitSlop={8}>
          <Text className="font-digitbold text-base text-racing">
            LV {level} · DAY {day} ›
          </Text>
        </Pressable>
      </View>

      <View className="mt-4 flex-1">
        <View className="h-[0.5px] bg-hairline" />
        <DraggableFlatList
          data={pending}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => reorderTasks(data.map((t) => t.id))}
          containerStyle={{ flex: 1 }}
          // 드롭 시 제자리로 정착하는 스프링 — 높은 damping·낮은 stiffness로 튕김 없이 부드럽게
          animationConfig={{ damping: 30, stiffness: 140, mass: 0.7, overshootClamping: true }}
          ItemSeparatorComponent={() => <View className="h-[0.5px] bg-hairline" />}
          renderItem={({ item, drag, isActive }: RenderItemParams<RunTask>) => (
            <ScaleDecorator>
              <Pressable
                className={`flex-row items-center justify-between py-3 ${
                  isActive ? 'bg-track' : ''
                }`}
                onPress={() => setEditingTask(item)}
                onLongPress={drag}
                delayLongPress={180}>
                <View className="flex-1 pr-2">
                  <Text className="text-[15px] text-ink">{item.title}</Text>
                  <View className="mt-1">
                    <Chevrons level={item.importance} />
                  </View>
                </View>
                <Text className="font-digit text-xl text-ink">
                  {formatClock(item.betSeconds)}
                </Text>
              </Pressable>
            </ScaleDecorator>
          )}
          ListEmptyComponent={
            <Text className="py-10 text-center text-[13px] text-ink-mute">
              아래에서 첫 태스크를 추가해 보세요
            </Text>
          }
          ListFooterComponent={<View className="h-[0.5px] bg-hairline" />}
        />
      </View>

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
      </KeyboardAvoidingView>

      <EditTaskSheet
        task={editingTask}
        onSave={(id, result) => updateTask(id, result)}
        onDelete={(id) => removeTask(id)}
        onClose={() => setEditingTask(null)}
      />
    </SafeAreaView>
  );
}
