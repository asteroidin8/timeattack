import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { runSavedSeconds, runXp } from '@/domain/xp';
import { useRunStore } from '@/stores/useRunStore';
import { formatClock } from '@/utils/time';

function CheckerFlag() {
  return (
    <View className="flex-row flex-wrap" style={{ width: 20 }}>
      {Array.from({ length: 8 }, (_, i) => {
        const row = Math.floor(i / 4);
        const filled = (i + row) % 2 === 0;
        return (
          <View key={i} className={`h-[5px] w-[5px] ${filled ? 'bg-ink' : 'bg-transparent'}`} />
        );
      })}
    </View>
  );
}

export default function ResultScreen() {
  const tasks = useRunStore((s) => s.tasks);
  const maxCombo = useRunStore((s) => s.maxCombo);
  const resetRun = useRunStore((s) => s.resetRun);

  const cleared = tasks.filter((t) => t.status === 'clear');
  const attempted = tasks.filter((t) => t.status !== 'pending');
  const totalFocusSeconds = cleared.reduce((sum, t) => sum + (t.actualSeconds ?? 0), 0);
  const xp = runXp(tasks);
  const savedSeconds = runSavedSeconds(tasks);

  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  const backToPlanning = () => {
    resetRun();
    router.replace('/');
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      {/* SafeAreaView는 inset을 인라인 padding으로 덮어쓰므로 레이아웃 패딩은 내부 View에 */}
      <View className="flex-1 px-6">
      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-[13px] text-ink-mute">{today} 결과</Text>
          <Text className="mt-1 text-2xl font-medium text-ink">오늘의 레이스</Text>
        </View>
        <CheckerFlag />
      </View>

      <View className="mt-10 items-center">
        <Text className="font-digitbold text-sm tracking-[3px] text-racing">FINISH</Text>
        <Text className="mt-1 font-digitbold text-6xl text-ink">
          {formatClock(totalFocusSeconds)}
        </Text>
        <Text className="mt-2 text-[13px] text-ink-mute">총 집중 시간</Text>
      </View>

      <View className="mt-8 flex-row border-y-[0.5px] border-hairline py-4">
        <View className="flex-1 items-center border-r-[0.5px] border-hairline">
          <Text className="font-digitbold text-2xl text-ink">
            {cleared.length}/{attempted.length}
          </Text>
          <Text className="mt-1 text-xs text-ink-mute">클리어</Text>
        </View>
        <View className="flex-1 items-center border-r-[0.5px] border-hairline">
          <Text className="font-digitbold text-2xl text-racing">+{xp}</Text>
          <Text className="mt-1 text-xs text-ink-mute">XP</Text>
        </View>
        <View className="flex-1 items-center border-r-[0.5px] border-hairline">
          <Text className="font-digitbold text-2xl text-ink">{formatClock(savedSeconds)}</Text>
          <Text className="mt-1 text-xs text-ink-mute">타임 세이브</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="font-digitbold text-2xl text-ink">×{maxCombo}</Text>
          <Text className="mt-1 text-xs text-ink-mute">최대 콤보</Text>
        </View>
      </View>

      <View className="mt-auto gap-3 pb-4">
        <Pressable
          className="items-center rounded-2xl border border-ink py-4 active:bg-track"
          onPress={() => Alert.alert('공유 카드', '2단계에서 만들 예정이에요.')}>
          <Text className="text-[15px] font-medium text-ink">스토리로 공유</Text>
        </Pressable>
        <Pressable className="items-center py-2" onPress={backToPlanning} hitSlop={8}>
          <Text className="text-[13px] text-ink-mute">새 플래닝 시작</Text>
        </Pressable>
      </View>
      </View>
    </SafeAreaView>
  );
}
