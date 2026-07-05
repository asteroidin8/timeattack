import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { buildRunRecord, DailyRecord, mergeDailyRecord } from '@/domain/progress';
import { RunTask } from '@/domain/xp';

interface ProgressState {
  records: Record<string, DailyRecord>;
  totalXp: number;
  addRunResult: (tasks: RunTask[], maxCombo: number) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      records: {},
      totalXp: 0,

      addRunResult: (tasks, maxCombo) => {
        const incoming = buildRunRecord(tasks, maxCombo, new Date());
        if (incoming.attempted === 0) return;
        set((state) => {
          const existing = state.records[incoming.date];
          const merged = mergeDailyRecord(existing, incoming);
          // totalXp는 일일 상한이 반영된 증가분만 누적
          const xpDelta = merged.xp - (existing?.xp ?? 0);
          return {
            records: { ...state.records, [incoming.date]: merged },
            totalXp: state.totalXp + xpDelta,
          };
        });
      },
    }),
    {
      name: 'timeattack-progress',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
