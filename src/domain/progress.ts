import { DAILY_XP_CAP, RunTask, runSavedSeconds, runXp } from './xp';

export interface DailyRecord {
  date: string;
  focusSeconds: number;
  xp: number;
  cleared: number;
  attempted: number;
  savedSeconds: number;
  maxCombo: number;
}

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function buildRunRecord(tasks: RunTask[], maxCombo: number, date: Date): DailyRecord {
  const cleared = tasks.filter((t) => t.status === 'clear');
  const attempted = tasks.filter((t) => t.status !== 'pending');
  return {
    date: dateKey(date),
    focusSeconds: cleared.reduce((sum, t) => sum + (t.actualSeconds ?? 0), 0),
    xp: runXp(tasks),
    cleared: cleared.length,
    attempted: attempted.length,
    savedSeconds: runSavedSeconds(tasks),
    maxCombo,
  };
}

// 하루에 여러 런을 돌려도 일일 XP 상한은 유지된다
export function mergeDailyRecord(
  existing: DailyRecord | undefined,
  incoming: DailyRecord,
): DailyRecord {
  if (!existing) {
    return { ...incoming, xp: Math.min(DAILY_XP_CAP, incoming.xp) };
  }
  return {
    date: incoming.date,
    focusSeconds: existing.focusSeconds + incoming.focusSeconds,
    xp: Math.min(DAILY_XP_CAP, existing.xp + incoming.xp),
    cleared: existing.cleared + incoming.cleared,
    attempted: existing.attempted + incoming.attempted,
    savedSeconds: existing.savedSeconds + incoming.savedSeconds,
    maxCombo: Math.max(existing.maxCombo, incoming.maxCombo),
  };
}

// DAY n = 어제까지 이어진 연속 기록일 + 오늘. 어제 기록이 없으면 오늘이 DAY 1.
export function streakDays(records: Record<string, unknown>, today: Date): number {
  let streak = 1;
  const cursor = new Date(today);
  for (;;) {
    cursor.setDate(cursor.getDate() - 1);
    if (records[dateKey(cursor)]) streak += 1;
    else break;
  }
  return streak;
}
