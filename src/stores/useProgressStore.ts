import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { buildRunRecord, DailyRecord, mergeDailyRecord } from '@/domain/progress';
import { RunTask } from '@/domain/xp';

interface ProgressState {
  // 복원 완료 전 기본값(0/빈 기록)이 화면에 잠깐 보이는 것을 막는 게이트
  hydrated: boolean;
  records: Record<string, DailyRecord>;
  totalXp: number;
  setHydrated: () => void;
  addRunResult: (tasks: RunTask[], maxCombo: number) => void;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      hydrated: false,
      records: {},
      totalXp: 0,

      setHydrated: () => set({ hydrated: true }),

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
      partialize: (state) => ({ records: state.records, totalXp: state.totalXp }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
