import { Dimensions, Text, View } from 'react-native';

import { DailyRecord, dateKey, focusLevel } from '@/domain/progress';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const GAP = 6;
const H_PADDING = 24 * 2;
const CELL = Math.floor((Dimensions.get('window').width - H_PADDING - GAP * 6) / 7);

// 레벨(0~4) → 레이싱 레드 강도. 0은 트랙 회색.
const LEVEL_FILL: Record<number, string> = {
  0: '#EEEDE8',
  1: 'rgba(229,32,46,0.28)',
  2: 'rgba(229,32,46,0.5)',
  3: 'rgba(229,32,46,0.75)',
  4: '#E5202E',
};

export function StreakCalendar({
  year,
  month,
  records,
}: {
  year: number;
  month: number;
  records: Record<string, DailyRecord>;
}) {
  const today = dateKey(new Date());
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => dateKey(new Date(year, month, i + 1))),
  ];

  return (
    <View className="items-center">
      <View className="flex-row" style={{ gap: GAP, marginBottom: 6 }}>
        {DAY_LABELS.map((d) => (
          <View key={d} style={{ width: CELL }} className="items-center">
            <Text className="text-[12px] text-ink-faint">{d}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap" style={{ gap: GAP }}>
        {cells.map((date, i) => {
          if (!date) return <View key={`e-${i}`} style={{ width: CELL, height: CELL }} />;
          const level = focusLevel(records[date]?.focusSeconds ?? 0);
          const isToday = date === today;
          const dayNum = parseInt(date.slice(8), 10);
          return (
            <View
              key={date}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 6,
                backgroundColor: LEVEL_FILL[level],
                borderWidth: isToday ? 1.5 : 0,
                borderColor: '#E5202E',
              }}
              className="items-center justify-center">
              <Text
                className={`text-[13px] ${level >= 3 ? 'text-white' : 'text-ink-mute'}`}
                style={isToday ? { fontWeight: '600' } : undefined}>
                {dayNum}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="mt-4 flex-row items-center gap-1 self-end">
        <Text className="text-[12px] text-ink-faint">적음</Text>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <View
            key={lvl}
            style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: LEVEL_FILL[lvl] }}
          />
        ))}
        <Text className="text-[12px] text-ink-faint">많음</Text>
      </View>
    </View>
  );
}
