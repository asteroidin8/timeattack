import { describe, expect, it } from '@jest/globals';

import {
  DAILY_XP_CAP,
  gradeClear,
  isBirdie,
  isEagle,
  levelForXp,
  runXp,
  RunTask,
  taskXp,
} from '../xp';

const clearedTask = (overrides: Partial<RunTask> = {}): RunTask => ({
  id: 't1',
  title: '테스트',
  importance: 1,
  betSeconds: 30 * 60,
  status: 'clear',
  actualSeconds: 30 * 60,
  ...overrides,
});

describe('gradeClear', () => {
  const bet = 1000;

  it('예상 ±10% 내 완료는 accurate', () => {
    expect(gradeClear(bet, 900)).toBe('accurate');
    expect(gradeClear(bet, 1000)).toBe('accurate');
    expect(gradeClear(bet, 1100)).toBe('accurate');
  });

  it('예상보다 훨씬 빠르면 early', () => {
    expect(gradeClear(bet, 899)).toBe('early');
    expect(gradeClear(bet, 500)).toBe('early');
  });

  it('시간 초과 완주는 overtime', () => {
    expect(gradeClear(bet, 1101)).toBe('overtime');
    expect(gradeClear(bet, 3000)).toBe('overtime');
  });
});

describe('taskXp — 인센티브 설계의 핵심 불변식', () => {
  it('정직한 베팅이 뻥튀기 베팅보다 항상 XP가 높다', () => {
    const actual = 30 * 60;
    const honest = taskXp(clearedTask({ betSeconds: 30 * 60, actualSeconds: actual }));
    const padded = taskXp(clearedTask({ betSeconds: 60 * 60, actualSeconds: actual }));
    expect(honest).toBeGreaterThan(padded);
    expect(honest).toBe(45);
    expect(padded).toBe(36);
  });

  it('중요도가 높을수록 XP가 커진다', () => {
    const low = taskXp(clearedTask({ importance: 1 }));
    const mid = taskXp(clearedTask({ importance: 2 }));
    const high = taskXp(clearedTask({ importance: 3 }));
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  it('포기하거나 기록이 없으면 0', () => {
    expect(taskXp(clearedTask({ status: 'giveup' }))).toBe(0);
    expect(taskXp(clearedTask({ status: 'pending' }))).toBe(0);
    expect(taskXp(clearedTask({ actualSeconds: undefined }))).toBe(0);
  });

  it('시간 초과여도 완주하면 집중 시간만큼의 XP는 받는다', () => {
    const overtime = taskXp(clearedTask({ betSeconds: 600, actualSeconds: 3600 }));
    expect(overtime).toBe(60);
  });
});

describe('runXp', () => {
  it('태스크 XP 합산에 일일 상한이 적용된다', () => {
    const marathon = clearedTask({
      importance: 3,
      betSeconds: 10 * 3600,
      actualSeconds: 10 * 3600,
    });
    expect(runXp([marathon, marathon])).toBe(DAILY_XP_CAP);
  });

  it('빈 목록은 0', () => {
    expect(runXp([])).toBe(0);
  });
});

describe('badges', () => {
  it('베팅의 90% 미만이면 버디, 60% 미만이면 이글', () => {
    expect(isBirdie(1000, 899)).toBe(true);
    expect(isBirdie(1000, 950)).toBe(false);
    expect(isEagle(1000, 599)).toBe(true);
    expect(isEagle(1000, 700)).toBe(false);
  });
});

describe('levelForXp', () => {
  it('레벨은 XP에 대해 단조 증가한다', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(400)).toBe(3);
    expect(levelForXp(-5)).toBe(1);
  });
});
