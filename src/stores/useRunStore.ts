import { create } from 'zustand';

import { Importance, RunTask } from '@/domain/xp';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const seedTasks: RunTask[] = [
  { id: uid(), title: '보고서 초안 쓰기', importance: 3, betSeconds: 50 * 60, status: 'pending' },
  { id: uid(), title: '영어 단어 60개', importance: 2, betSeconds: 25 * 60, status: 'pending' },
  { id: uid(), title: '메일 정리', importance: 1, betSeconds: 15 * 60, status: 'pending' },
];

interface RunState {
  tasks: RunTask[];
  currentIndex: number | null;
  startedAt: number | null;
  endAt: number | null;
  combo: number;
  maxCombo: number;
  addTask: (title: string, importance: Importance, betMinutes: number) => void;
  removeTask: (id: string) => void;
  startRun: () => boolean;
  completeCurrent: () => void;
  giveUpCurrent: () => void;
  resetRun: () => void;
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

export const useRunStore = create<RunState>((set, get) => ({
  tasks: seedTasks,
  currentIndex: null,
  startedAt: null,
  endAt: null,
  combo: 0,
  maxCombo: 0,

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

  removeTask: (id) => {
    set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
  },

  startRun: () => {
    const placement = advance(get().tasks);
    if (placement.currentIndex === null) return false;
    set({ ...placement, combo: 0, maxCombo: 0 });
    return true;
  },

  completeCurrent: () => {
    const { tasks, currentIndex, startedAt, combo, maxCombo } = get();
    if (currentIndex === null || startedAt === null) return;
    const actualSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const nextTasks = tasks.map((task, index) =>
      index === currentIndex
        ? { ...task, status: 'clear' as const, actualSeconds }
        : task,
    );
    const nextCombo = combo + 1;
    set({
      tasks: nextTasks,
      combo: nextCombo,
      maxCombo: Math.max(nextCombo, maxCombo),
      ...advance(nextTasks),
    });
  },

  giveUpCurrent: () => {
    const { tasks, currentIndex } = get();
    if (currentIndex === null) return;
    const nextTasks = tasks.map((task, index) =>
      index === currentIndex ? { ...task, status: 'giveup' as const } : task,
    );
    set({ tasks: nextTasks, combo: 0, ...advance(nextTasks) });
  },

  resetRun: () => {
    set((state) => ({
      tasks: state.tasks.map((task) => ({
        ...task,
        status: 'pending' as const,
        actualSeconds: undefined,
      })),
      currentIndex: null,
      startedAt: null,
      endAt: null,
      combo: 0,
      maxCombo: 0,
    }));
  },
}));
