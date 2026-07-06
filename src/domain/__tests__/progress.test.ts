import { describe, expect, it } from '@jest/globals';

import {
  buildRunRecord,
  DailyRecord,
  dateKey,
  focusLevel,
  mergeDailyRecord,
  streakDays,
  totalSavedSeconds,
  weeklyFocusSeconds,
} from '../progress';
import { DAILY_XP_CAP, RunTask } from '../xp';

const task = (overrides: Partial<RunTask> = {}): RunTask => ({
  id: 't',
  title: '테스트',
  importance: 1,
  betSeconds: 1800,
  status: 'clear',
  actualSeconds: 1800,
  ...overrides,
});

const record = (overrides: Partial<DailyRecord> = {}): DailyRecord => ({
  date: '2026-07-05',
  focusSeconds: 600,
  xp: 100,
  cleared: 1,
  attempted: 1,
  savedSeconds: 0,
  maxCombo: 1,
  ...overrides,
});

describe('dateKey', () => {
  it('로컬 날짜를 YYYY-MM-DD로 만든다', () => {
    expect(dateKey(new Date(2026, 6, 5, 23, 59))).toBe('2026-07-05');
    expect(dateKey(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});

describe('buildRunRecord', () => {
  it('클리어한 태스크만 집중 시간에 합산한다', () => {
    const tasks = [
      task({ actualSeconds: 1000 }),
      task({ status: 'giveup', actualSeconds: undefined }),
      task({ actualSeconds: 500, betSeconds: 900 }),
    ];
    const built = buildRunRecord(tasks, 2, new Date(2026, 6, 5));
    expect(built.focusSeconds).toBe(1500);
    expect(built.cleared).toBe(2);
    expect(built.attempted).toBe(3);
    expect(built.savedSeconds).toBe(1200);
    expect(built.maxCombo).toBe(2);
  });
});

describe('mergeDailyRecord', () => {
  it('같은 날 여러 런은 합산되고 최대 콤보는 최댓값', () => {
    const merged = mergeDailyRecord(
      record({ focusSeconds: 600, xp: 100, maxCombo: 3 }),
      record({ focusSeconds: 400, xp: 50, maxCombo: 2 }),
    );
    expect(merged.focusSeconds).toBe(1000);
    expect(merged.xp).toBe(150);
    expect(merged.maxCombo).toBe(3);
    expect(merged.cleared).toBe(2);
  });

  it('일일 XP 상한은 여러 런을 합쳐도 유지된다', () => {
    const merged = mergeDailyRecord(
      record({ xp: DAILY_XP_CAP - 10 }),
      record({ xp: 500 }),
    );
    expect(merged.xp).toBe(DAILY_XP_CAP);
  });

  it('첫 기록에도 상한이 적용된다', () => {
    const merged = mergeDailyRecord(undefined, record({ xp: DAILY_XP_CAP + 999 }));
    expect(merged.xp).toBe(DAILY_XP_CAP);
  });
});

describe('streakDays', () => {
  const today = new Date(2026, 6, 5);

  it('기록이 없으면 오늘이 DAY 1', () => {
    expect(streakDays({}, today)).toBe(1);
  });

  it('어제까지 연속 기록이 있으면 이어진다', () => {
    const records = { '2026-07-04': true, '2026-07-03': true };
    expect(streakDays(records, today)).toBe(3);
  });

  it('하루라도 끊기면 DAY 1부터', () => {
    const records = { '2026-07-03': true, '2026-07-02': true };
    expect(streakDays(records, today)).toBe(1);
  });

  it('오늘 기록 여부는 스트릭에 영향 없다 (오늘은 항상 포함)', () => {
    const records = { '2026-07-05': true };
    expect(streakDays(records, today)).toBe(1);
  });

  it('월 경계를 넘어도 이어진다', () => {
    const records = { '2026-06-30': true, '2026-07-01': true, '2026-07-02': true, '2026-07-03': true, '2026-07-04': true };
    expect(streakDays(records, today)).toBe(6);
  });
});

describe('통계 집계', () => {
  const today = new Date(2026, 6, 5);
  const recs: Record<string, DailyRecord> = {
    '2026-07-05': record({ date: '2026-07-05', focusSeconds: 600, savedSeconds: 120 }),
    '2026-07-03': record({ date: '2026-07-03', focusSeconds: 1800, savedSeconds: 300 }),
    '2026-06-27': record({ date: '2026-06-27', focusSeconds: 900, savedSeconds: 90 }),
  };

  it('weeklyFocusSeconds는 최근 7일만 합산한다', () => {
    // 07-05, 07-03만 최근 7일(06-29~07-05), 06-27은 제외
    expect(weeklyFocusSeconds(recs, today)).toBe(2400);
  });

  it('totalSavedSeconds는 전체를 합산한다', () => {
    expect(totalSavedSeconds(recs)).toBe(510);
  });

  it('focusLevel은 집중 시간을 0~4로 버킷팅한다', () => {
    expect(focusLevel(0)).toBe(0);
    expect(focusLevel(20 * 60)).toBe(1);
    expect(focusLevel(45 * 60)).toBe(2);
    expect(focusLevel(90 * 60)).toBe(3);
    expect(focusLevel(180 * 60)).toBe(4);
  });
});
