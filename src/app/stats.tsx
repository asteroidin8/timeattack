import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StreakCalendar } from '@/components/StreakCalendar';
import { streakDays, totalSavedSeconds, weeklyFocusSeconds } from '@/domain/progress';
import { levelForXp } from '@/domain/xp';
import { useProgressStore } from '@/stores/useProgressStore';
import { formatClock } from '@/utils/time';

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-1 rounded-xl bg-track px-4 py-4">
      <Text className="text-[11px] text-ink-mute">{label}</Text>
      <Text className={`mt-1 font-digitbold text-3xl ${accent ? 'text-racing' : 'text-ink'}`}>
        {value}
      </Text>
    </View>
  );
}

export default function StatsScreen() {
  const records = useProgressStore((s) => s.records);
  const totalXp = useProgressStore((s) => s.totalXp);
  const hydrated = useProgressStore((s) => s.hydrated);

  const now = new Date();
  const weekly = weeklyFocusSeconds(records, now);
  const saved = totalSavedSeconds(records);
  const day = streakDays(records, now);
  const level = levelForXp(totalXp);
  const hasRecords = Object.keys(records).length > 0;

  // 복원 전 0 값 깜빡임 방지 — 배경만 유지
  if (!hydrated) return <SafeAreaView className="flex-1 bg-paper" />;

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="flex-1 px-6">
        <View className="mt-4 flex-row items-center justify-between">
          <Text className="text-2xl font-medium text-ink">기록</Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text className="text-[13px] text-ink-mute">닫기</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="mt-6">
          <View className="flex-row gap-3">
            <Metric label="이번 주 집중" value={formatClock(weekly)} />
            <Metric label="누적 타임 세이브" value={formatClock(saved)} accent />
          </View>
          <View className="mt-3 flex-row gap-3">
            <Metric label="레벨" value={`LV ${level}`} />
            <Metric label="연속" value={`DAY ${day}`} />
          </View>

          <Text className="mb-4 mt-9 text-[13px] font-medium text-ink">
            {now.getMonth() + 1}월 집중 캘린더
          </Text>
          {hasRecords ? (
            <StreakCalendar year={now.getFullYear()} month={now.getMonth()} records={records} />
          ) : (
            <Text className="py-10 text-center text-[13px] text-ink-mute">
              첫 레이스를 완주하면 기록이 채워져요
            </Text>
          )}

          <View className="h-10" />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
