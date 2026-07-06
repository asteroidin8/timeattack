import { forwardRef } from 'react';
import { Text, View } from 'react-native';

import { formatClock } from '@/utils/time';

export interface ShareCardData {
  dateLabel: string;
  focusSeconds: number;
  cleared: number;
  attempted: number;
  xp: number;
  savedSeconds: number;
  maxCombo: number;
  level: number;
  day: number;
}

function Checker() {
  return (
    <View className="flex-row flex-wrap" style={{ width: 24 }}>
      {Array.from({ length: 8 }, (_, i) => {
        const row = Math.floor(i / 4);
        const filled = (i + row) % 2 === 0;
        return (
          <View key={i} className={`h-[6px] w-[6px] ${filled ? 'bg-ink' : 'bg-transparent'}`} />
        );
      })}
    </View>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View className="flex-1 items-center">
      <Text className={`font-digitbold text-2xl ${accent ? 'text-racing' : 'text-ink'}`}>
        {value}
      </Text>
      <Text className="mt-1 text-xs text-ink-mute">{label}</Text>
    </View>
  );
}

// 인스타 스토리용 9:16 결과 카드 — 화면 밖에서 렌더된 뒤 view-shot으로 캡처된다
export const ShareCard = forwardRef<View, { data: ShareCardData }>(function ShareCard(
  { data },
  ref,
) {
  return (
    <View
      ref={ref}
      collapsable={false}
      className="bg-paper px-8 py-12"
      style={{ width: 360, height: 640 }}>
      <View className="flex-row items-center justify-between">
        <Text className="font-digitbold text-base tracking-[2px] text-racing">TODORUN</Text>
        <Checker />
      </View>

      <View className="flex-1 items-center justify-center">
        <Text className="text-[13px] text-ink-mute">{data.dateLabel}</Text>
        <Text className="mt-6 font-digitbold text-sm tracking-[4px] text-racing">FINISH</Text>
        <Text className="mt-2 font-digitbold text-7xl text-ink">
          {formatClock(data.focusSeconds)}
        </Text>
        <Text className="mt-2 text-[13px] text-ink-mute">총 집중 시간</Text>

        <View className="mt-10 w-full flex-row border-y-[0.5px] border-hairline py-4">
          <Stat label="클리어" value={`${data.cleared}/${data.attempted}`} />
          <Stat label="XP" value={`+${data.xp}`} accent />
          <Stat label="타임 세이브" value={formatClock(data.savedSeconds)} />
        </View>
        <Text className="mt-4 font-digitbold text-base text-ink">
          COMBO ×{data.maxCombo}
        </Text>
      </View>

      <Text className="text-center font-digitbold text-sm text-racing">
        LV {data.level} · DAY {data.day} · 오늘의 레이스
      </Text>
    </View>
  );
});
