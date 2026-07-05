export type Importance = 1 | 2 | 3;
export type TaskStatus = 'pending' | 'clear' | 'giveup';

export interface RunTask {
  id: string;
  title: string;
  importance: Importance;
  betSeconds: number;
  status: TaskStatus;
  actualSeconds?: number;
}

export type ClearGrade = 'early' | 'accurate' | 'overtime';

export const IMPORTANCE_MULTIPLIER: Record<Importance, number> = {
  1: 1,
  2: 1.5,
  3: 2,
};

// 정확도 배수의 정점은 "빨리"가 아니라 "예측이 맞았을 때".
// 조기 완료가 정확 완료보다 유리해지면 예상 시간 뻥튀기가 최적 전략이 된다.
export const GRADE_MULTIPLIER: Record<ClearGrade, number> = {
  accurate: 1.5,
  early: 1.2,
  overtime: 1,
};

export const DAILY_XP_CAP = 1200;

export const EARLY_THRESHOLD = 0.9;
export const ACCURATE_UPPER = 1.1;
export const EAGLE_THRESHOLD = 0.6;

export function gradeClear(betSeconds: number, actualSeconds: number): ClearGrade {
  if (actualSeconds < betSeconds * EARLY_THRESHOLD) return 'early';
  if (actualSeconds <= betSeconds * ACCURATE_UPPER) return 'accurate';
  return 'overtime';
}

export function isBirdie(betSeconds: number, actualSeconds: number): boolean {
  return actualSeconds < betSeconds * EARLY_THRESHOLD;
}

export function isEagle(betSeconds: number, actualSeconds: number): boolean {
  return actualSeconds < betSeconds * EAGLE_THRESHOLD;
}

export function taskXp(task: RunTask): number {
  if (task.status !== 'clear' || task.actualSeconds == null) return 0;
  const focusMinutes = task.actualSeconds / 60;
  const grade = gradeClear(task.betSeconds, task.actualSeconds);
  return Math.floor(
    focusMinutes * IMPORTANCE_MULTIPLIER[task.importance] * GRADE_MULTIPLIER[grade],
  );
}

export function runXp(tasks: RunTask[]): number {
  const total = tasks.reduce((sum, task) => sum + taskXp(task), 0);
  return Math.min(DAILY_XP_CAP, total);
}

export function levelForXp(totalXp: number): number {
  if (totalXp < 0) return 1;
  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}
