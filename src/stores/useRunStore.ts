import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  AwayState,
  initialAwayState,
  onBackground,
  onForeground,
  onScreenEvent,
  resetAwayForNextTask,
  ScreenEvent,
} from '@/domain/away';
import { dateKey } from '@/domain/progress';
import { Importance, RunTask } from '@/domain/xp';
import { useProgressStore } from '@/stores/useProgressStore';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

interface TaskFields {
  title?: string;
  importance?: Importance;
  betMinutes?: number;
}

interface RunState {
  // AsyncStorage 복원 완료 전에는 화면 라우팅 판단을 하면 안 된다 (기본값을 진짜 상태로 오인)
  hydrated: boolean;
  onboarded: boolean;
  tasks: RunTask[];
  currentIndex: number | null;
  startedAt: number | null;
  endAt: number | null;
  combo: number;
  maxCombo: number;
  // 이탈 회계 (domain/away.ts 위임) — 잠금은 집중 인정, 앱 전환은 차감
  away: AwayState;
  lastPlanDate: string | null;
  setHydrated: () => void;
  completeOnboarding: () => void;
  addTask: (title: string, importance: Importance, betMinutes: number) => void;
  updateTask: (id: string, fields: TaskFields) => void;
  removeTask: (id: string) => void;
  reorderTasks: (orderedPendingIds: string[]) => void;
  startRun: () => boolean;
  completeCurrent: () => void;
  giveUpCurrent: () => void;
  resetRun: () => void;
  markAway: () => void;
  handleScreenEvent: (event: ScreenEvent) => void;
  // 포그라운드 복귀 정산 — 이번 구간에서 차감된 초를 반환 (실패 없음)
  settleAway: () => number;
  rolloverIfNeeded: () => void;
}

function advance(tasks: RunTask[]) {
  const next = tasks.findIndex((task) => task.status === 'pending');
  if (next === -1) {
    return { currentIndex: null, startedAt: null, endAt: null };
  }
  const now = Date.now();
  return {
    currentIndex: next,
    startedAt: now,
    endAt: now + tasks[next].betSeconds * 1000,
  };
}

export const useRunStore = create<RunState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      onboarded: false,
      tasks: [],
      currentIndex: null,
      startedAt: null,
      endAt: null,
      combo: 0,
      maxCombo: 0,
      away: initialAwayState,
      lastPlanDate: null,

      setHydrated: () => set({ hydrated: true }),

      completeOnboarding: () => set({ onboarded: true }),

      addTask: (title, importance, betMinutes) => {
        const trimmed = title.trim();
        if (!trimmed) return;
        set((state) => ({
          tasks: [
            ...state.tasks,
            {
              id: uid(),
              title: trimmed,
              importance,
              betSeconds: Math.max(10, betMinutes) * 60,
              status: 'pending' as const,
            },
          ],
        }));
      },

      updateTask: (id, fields) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== id) return task;
            const trimmed = fields.title?.trim();
            return {
              ...task,
              title: trimmed ? trimmed : task.title,
              importance: fields.importance ?? task.importance,
              betSeconds: fields.betMinutes
                ? Math.max(10, fields.betMinutes) * 60
                : task.betSeconds,
            };
          }),
        }));
      },

      removeTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
      },

      // DnD 결과 반영: pending 태스크를 새 순서로, 비-pending은 뒤에 유지
      reorderTasks: (orderedPendingIds) => {
        set((state) => {
          const byId = new Map(state.tasks.map((t) => [t.id, t]));
          const reordered = orderedPendingIds
            .map((id) => byId.get(id))
            .filter((t): t is RunTask => t != null && t.status === 'pending');
          const rest = state.tasks.filter((t) => t.status !== 'pending');
          return { tasks: [...reordered, ...rest] };
        });
      },

      startRun: () => {
        const placement = advance(get().tasks);
        if (placement.currentIndex === null) return false;
        set({ ...placement, combo: 0, maxCombo: 0, away: initialAwayState });
        return true;
      },

      completeCurrent: () => {
        const { tasks, currentIndex, startedAt, combo, maxCombo, away } = get();
        if (currentIndex === null || startedAt === null) return;
        // 자리 비운(다른 앱) 시간은 집중에서 차감 — 잠금 시간은 away에 안 쌓여 온전히 인정됨
        const wallSeconds = Math.round((Date.now() - startedAt) / 1000);
        const actualSeconds = Math.max(1, wallSeconds - Math.round(away.awaySeconds));
        const nextTasks = tasks.map((task, index) =>
          index === currentIndex
            ? { ...task, status: 'clear' as const, actualSeconds }
            : task,
        );
        const nextCombo = combo + 1;
        const nextMaxCombo = Math.max(nextCombo, maxCombo);
        const placement = advance(nextTasks);
        set((state) => ({
          tasks: nextTasks,
          combo: nextCombo,
          maxCombo: nextMaxCombo,
          away: resetAwayForNextTask(state.away),
          ...placement,
        }));
        if (placement.currentIndex === null) {
          useProgressStore.getState().addRunResult(nextTasks, nextMaxCombo);
        }
      },

      giveUpCurrent: () => {
        const { tasks, currentIndex, maxCombo } = get();
        if (currentIndex === null) return;
        const nextTasks = tasks.map((task, index) =>
          index === currentIndex ? { ...task, status: 'giveup' as const } : task,
        );
        const placement = advance(nextTasks);
        set((state) => ({
          tasks: nextTasks,
          combo: 0,
          away: resetAwayForNextTask(state.away),
          ...placement,
        }));
        if (placement.currentIndex === null) {
          useProgressStore.getState().addRunResult(nextTasks, maxCombo);
        }
      },

      resetRun: () => {
        set((state) => ({
          // 완료/포기한 태스크는 정리하고 남은 할 일만 새 플래닝으로 (롤오버와 동일 규칙)
          tasks: state.tasks.filter((task) => task.status === 'pending'),
          currentIndex: null,
          startedAt: null,
          endAt: null,
          combo: 0,
          maxCombo: 0,
          away: initialAwayState,
        }));
      },

      markAway: () => {
        const { currentIndex } = get();
        if (currentIndex === null) return;
        set((state) => ({ away: onBackground(state.away, Date.now()) }));
      },

      handleScreenEvent: (event) => {
        set((state) => ({ away: onScreenEvent(state.away, event, Date.now()) }));
      },

      settleAway: () => {
        const { away, currentIndex } = get();
        if (currentIndex === null) {
          set({ away: initialAwayState });
          return 0;
        }
        const { state: nextAway, deductedSeconds } = onForeground(away, Date.now());
        set({ away: nextAway });
        return deductedSeconds;
      },

      // 자정이 지나면 어제의 완료/포기 태스크를 목록에서 정리 (기록은 progress에 남아 있음)
      rolloverIfNeeded: () => {
        const { lastPlanDate, currentIndex, tasks } = get();
        if (currentIndex !== null) return;
        const today = dateKey(new Date());
        if (lastPlanDate === today) return;
        set({
          tasks: tasks.filter((task) => task.status === 'pending'),
          lastPlanDate: today,
        });
      },
    }),
    {
      name: 'timeattack-run',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        onboarded: state.onboarded,
        tasks: state.tasks,
        currentIndex: state.currentIndex,
        startedAt: state.startedAt,
        endAt: state.endAt,
        combo: state.combo,
        maxCombo: state.maxCombo,
        // awayIsLock/screenLocked는 의도적으로 미보존 — 앱 킬 후엔 잠금 여부를 알 수 없어
        // 보수적으로 '앱 전환(차감)'으로 폴백 (domain/away.ts 테스트 참조)
        away: {
          awayAt: state.away.awayAt,
          awayIsLock: false,
          screenLocked: false,
          awaySeconds: state.away.awaySeconds,
        },
        lastPlanDate: state.lastPlanDate,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
