// 세션 이탈 회계 (B+C 완성형)
// - 폰 잠금(화면 꺼짐) 동안은 집중으로 인정 → 차감 없음
// - 다른 앱/런처에 있는 동안은 차감 (awaySeconds 누적) — 실패(미완주)는 없음
// - 잠금 해제(present) 후 앱 복귀 전까지는 '다른 앱 가능성' 구간이라 차감 대상
// 이벤트 순서 경합(배경전환 ↔ 화면꺼짐)이 있어 상태 기계를 순수 함수로 분리해 테스트한다.

export interface AwayState {
  // background 진입 시각 (null = 포그라운드)
  awayAt: number | null;
  // 현재 background 구간이 잠금 때문인가
  awayIsLock: boolean;
  // 화면이 꺼져(잠겨) 있는가 — background 진입 전에 off가 먼저 와도 기억
  screenLocked: boolean;
  // 현재 태스크에서 차감할 누적 초
  awaySeconds: number;
}

export const initialAwayState: AwayState = {
  awayAt: null,
  awayIsLock: false,
  screenLocked: false,
  awaySeconds: 0,
};

export type ScreenEvent = 'off' | 'on' | 'present';

// 앱이 background로 전환 — 이미 화면이 꺼진 상태였다면 잠금 이탈로 분류
export function onBackground(s: AwayState, now: number): AwayState {
  if (s.awayAt !== null) return s;
  return { ...s, awayAt: now, awayIsLock: s.screenLocked };
}

export function onScreenEvent(s: AwayState, event: ScreenEvent, now: number): AwayState {
  if (event === 'off') {
    // background 전환이 먼저 왔더라도 잠금이 원인이었던 것으로 재분류
    // (전환~잠금 사이 수백 ms는 잠금으로 간주)
    return { ...s, screenLocked: true, awayIsLock: s.awayAt !== null ? true : s.awayIsLock };
  }
  if (event === 'present') {
    // 잠금 해제 — 여기서부터 앱 복귀 전까지는 차감 대상 구간으로 전환
    if (s.awayAt !== null && s.awayIsLock) {
      return { ...s, screenLocked: false, awayAt: now, awayIsLock: false };
    }
    return { ...s, screenLocked: false };
  }
  // 'on': 잠금화면만 켜진 상태 — 여전히 잠금 구간
  return s;
}

// 앱 포그라운드 복귀 — 차감분을 정산해 누적하고 구간을 닫는다
export function onForeground(
  s: AwayState,
  now: number,
): { state: AwayState; deductedSeconds: number } {
  if (s.awayAt === null) {
    return { state: { ...s, screenLocked: false }, deductedSeconds: 0 };
  }
  const deducted = s.awayIsLock ? 0 : Math.max(0, Math.round((now - s.awayAt) / 1000));
  return {
    state: {
      ...s,
      awayAt: null,
      awayIsLock: false,
      screenLocked: false,
      awaySeconds: s.awaySeconds + deducted,
    },
    deductedSeconds: deducted,
  };
}

// 태스크 전환/런 시작 시 현재 태스크의 차감 누적만 리셋
export function resetAwayForNextTask(s: AwayState): AwayState {
  return { ...s, awaySeconds: 0 };
}
