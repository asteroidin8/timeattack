import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { ShareCard } from '@/components/ShareCard';
import { streakDays } from '@/domain/progress';
import { levelForXp, runSavedSeconds, runXp } from '@/domain/xp';
import { useCountUp } from '@/hooks/useCountUp';
import { useProgressStore } from '@/stores/useProgressStore';
import { useRunStore } from '@/stores/useRunStore';
import { notify } from '@/utils/dialog';
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
  const hydrated = useRunStore((s) => s.hydrated);
  const currentIndex = useRunStore((s) => s.currentIndex);
  const records = useProgressStore((s) => s.records);
  const totalXp = useProgressStore((s) => s.totalXp);

  const cardRef = useRef<View>(null);

  // 진행 중인 런이 있는데 결과로 직접 진입하면 세션으로 복귀
  useEffect(() => {
    if (hydrated && currentIndex !== null) router.replace('/session');
  }, [hydrated, currentIndex]);

  const cleared = tasks.filter((t) => t.status === 'clear');
  const attempted = tasks.filter((t) => t.status !== 'pending');
  const totalFocusSeconds = cleared.reduce((sum, t) => sum + (t.actualSeconds ?? 0), 0);
  const xp = runXp(tasks);
  const savedSeconds = runSavedSeconds(tasks);
  const level = levelForXp(totalXp);
  const day = streakDays(records, new Date());

  // 타임 세이브 히어로: 카운트업 롤링 + 베팅 대비 아낀 비율 게이지
  const animatedSavedSeconds = useCountUp(savedSeconds);
  const attemptedBetSeconds = attempted.reduce((sum, t) => sum + t.betSeconds, 0);
  const savedRatio = attemptedBetSeconds > 0 ? savedSeconds / attemptedBetSeconds : 0;
  const GAUGE_SEGMENTS = 5;
  const filledSegments =
    savedSeconds > 0
      ? Math.max(1, Math.min(GAUGE_SEGMENTS, Math.round(savedRatio * GAUGE_SEGMENTS)))
      : 0;

  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  const backToPlanning = () => {
    resetRun();
    router.replace('/');
  };

  const share = async () => {
    if (Platform.OS === 'web') {
      notify('공유 카드', '공유는 모바일 앱에서 사용할 수 있어요.');
      return;
    }
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      notify('공유 실패', '잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-paper">
      {/* SafeAreaView는 inset을 인라인 padding으로 덮어쓰므로 레이아웃 패딩은 내부 View에 */}
      <View className="flex-1 px-6">
      <View className="mt-4 flex-row items-end justify-between">
        <View>
          <Text className="text-[15px] text-ink-mute">{today} 결과</Text>
          <Text className="mt-1 text-3xl font-medium text-ink">오늘의 레이스</Text>
        </View>
        <CheckerFlag />
      </View>

      <View className="mt-8 items-center">
        <Text className="font-digitbold text-lg tracking-[3px] text-racing">FINISH</Text>
        <Text className="mt-1 font-digitbold text-6xl text-ink">
          {formatClock(totalFocusSeconds)}
        </Text>
        <Text className="mt-2 text-[15px] text-ink-mute">총 집중 시간</Text>
      </View>

      <View className="mt-7 items-center">
        <Text className="font-digitbold text-lg tracking-[2px] text-racing">TIME SAVE</Text>
        <Text className="mt-1 font-digitbold text-7xl text-ink">
          +{formatClock(animatedSavedSeconds)}
        </Text>
        <Text className="mt-2 text-[15px] text-ink-mute">아낀 시간</Text>
        <View className="mt-5 w-56 flex-row gap-1">
          {Array.from({ length: GAUGE_SEGMENTS }, (_, i) => (
            <View
              key={i}
              className={`h-2 flex-1 ${i < filledSegments ? 'bg-racing' : 'bg-track'}`}
              style={{ transform: [{ skewX: '-20deg' }] }}
            />
          ))}
        </View>
      </View>

      <View className="mt-7 flex-row border-y-[0.5px] border-hairline py-4">
        <View className="flex-1 items-center border-r-[0.5px] border-hairline">
          <Text className="font-digitbold text-3xl text-ink">
            {cleared.length}/{attempted.length}
          </Text>
          <Text className="mt-1 text-sm text-ink-mute">클리어</Text>
        </View>
        <View className="flex-1 items-center border-r-[0.5px] border-hairline">
          <Text className="font-digitbold text-3xl text-racing">+{xp}</Text>
          <Text className="mt-1 text-sm text-ink-mute">XP</Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="font-digitbold text-3xl text-ink">×{maxCombo}</Text>
          <Text className="mt-1 text-sm text-ink-mute">최대 콤보</Text>
        </View>
      </View>

      <View className="mt-auto gap-3 pb-4">
        <Pressable
          className="items-center rounded-2xl border border-ink py-5 active:bg-track"
          onPress={share}>
          <Text className="text-[18px] font-medium text-ink">스토리로 공유</Text>
        </Pressable>
        <Pressable className="items-center py-2" onPress={backToPlanning} hitSlop={8}>
          <Text className="text-[15px] text-ink-mute">새 플래닝 시작</Text>
        </Pressable>
      </View>
      </View>

      {/* 공유 카드: 화면 밖에서 렌더해두고 공유 시 캡처 */}
      {Platform.OS !== 'web' && (
        <View style={{ position: 'absolute', left: -1000, top: 0 }} pointerEvents="none">
          <ShareCard
            ref={cardRef}
            data={{
              dateLabel: today,
              focusSeconds: totalFocusSeconds,
              cleared: cleared.length,
              attempted: attempted.length,
              xp,
              savedSeconds,
              maxCombo,
              level,
              day,
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
