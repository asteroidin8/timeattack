export type Importance = 1 | 2 | 3;
export type TaskStatus = 'pending' | 'clear' | 'giveup';

export interface RunTask {
  id: string;
  title: string;
  importance: Importance;
  betSeconds: number;
  status: TaskStatus;
  actualSeconds?: number;
  // 병행 태스크: 다른 앱을 써도 집중으로 인정(이탈 차감 면제). 3단계 랭킹 집계에서는 제외 예정
  parallel?: boolean;
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

export function gradeClear(betSeconds: number, actualSeconds: number): ClearGrade {
  if (actualSeconds < betSeconds * EARLY_THRESHOLD) return 'early';
  if (actualSeconds <= betSeconds * ACCURATE_UPPER) return 'accurate';
  return 'overtime';
}

// 타임 세이브: 베팅보다 빨리 클리어해서 아낀 시간. 초과분은 0으로 취급(감점은 XP 배수가 담당).
export function taskSavedSeconds(task: RunTask): number {
  if (task.status !== 'clear' || task.actualSeconds == null) return 0;
  return Math.max(0, task.betSeconds - task.actualSeconds);
}

export function runSavedSeconds(tasks: RunTask[]): number {
  return tasks.reduce((sum, task) => sum + taskSavedSeconds(task), 0);
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

// 초과 방치 방어: 세션을 방치해도 기록은 베팅의 2배 시점까지만 인정한다 (V1-8).
export const OVERTIME_CAP_MULTIPLIER = 2;

export function capOvertimeWallSeconds(betSeconds: number, wallSeconds: number): number {
  const cap = betSeconds * OVERTIME_CAP_MULTIPLIER;
  return Math.min(wallSeconds, cap);
}
