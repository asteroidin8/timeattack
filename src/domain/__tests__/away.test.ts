import { describe, expect, it } from '@jest/globals';

import {
  AwayState,
  initialAwayState,
  onBackground,
  onForeground,
  onScreenEvent,
  resetAwayForNextTask,
} from '../away';

const T0 = 1_000_000;
const sec = (n: number) => n * 1000;

describe('이탈 회계 (B+C 완성형)', () => {
  it('다른 앱 전환: 이탈 시간만큼 차감, 실패 없음', () => {
    let s = onBackground(initialAwayState, T0);
    const { state, deductedSeconds } = onForeground(s, T0 + sec(40));
    expect(deductedSeconds).toBe(40);
    expect(state.awaySeconds).toBe(40);
    expect(state.awayAt).toBeNull();
  });

  it('잠금(off → background): 차감 0 — 집중으로 인정', () => {
    let s = onScreenEvent(initialAwayState, 'off', T0);
    s = onBackground(s, T0 + 200);
    const { deductedSeconds, state } = onForeground(s, T0 + sec(1800));
    expect(deductedSeconds).toBe(0);
    expect(state.awaySeconds).toBe(0);
  });

  it('경합 순서(background → off)에도 잠금으로 재분류된다', () => {
    let s = onBackground(initialAwayState, T0);
    s = onScreenEvent(s, 'off', T0 + 300);
    const { deductedSeconds } = onForeground(s, T0 + sec(600));
    expect(deductedSeconds).toBe(0);
  });

  it('잠금 해제 후 앱에 안 돌아오고 배회한 시간은 차감된다', () => {
    let s = onScreenEvent(initialAwayState, 'off', T0);
    s = onBackground(s, T0 + 100);
    // 30분 잠금 후 해제
    s = onScreenEvent(s, 'present', T0 + sec(1800));
    // 해제 후 5분 배회하다 복귀
    const { deductedSeconds } = onForeground(s, T0 + sec(1800) + sec(300));
    expect(deductedSeconds).toBe(300);
  });

  it("화면만 켜짐('on', 잠금화면)은 잠금 구간을 유지한다", () => {
    let s = onScreenEvent(initialAwayState, 'off', T0);
    s = onBackground(s, T0 + 100);
    s = onScreenEvent(s, 'on', T0 + sec(60));
    const { deductedSeconds } = onForeground(s, T0 + sec(120));
    expect(deductedSeconds).toBe(0);
  });

  it('앱 킬 폴백: awayIsLock이 복원되지 않으면(false) 보수적으로 차감', () => {
    // persist에는 awayAt만 남고 awayIsLock은 in-memory → 재실행 시 false
    const revived: AwayState = { ...initialAwayState, awayAt: T0 };
    const { deductedSeconds } = onForeground(revived, T0 + sec(90));
    expect(deductedSeconds).toBe(90);
  });

  it('여러 구간의 차감이 누적되고, 태스크 전환 시 리셋된다', () => {
    let s = onBackground(initialAwayState, T0);
    s = onForeground(s, T0 + sec(10)).state;
    s = onBackground(s, T0 + sec(100));
    s = onForeground(s, T0 + sec(100) + sec(20)).state;
    expect(s.awaySeconds).toBe(30);
    expect(resetAwayForNextTask(s).awaySeconds).toBe(0);
  });

  it('포그라운드 상태에서의 settle은 0', () => {
    const { deductedSeconds } = onForeground(initialAwayState, T0);
    expect(deductedSeconds).toBe(0);
  });
});
