import ScreenStateModule from '../../modules/screen-state/src/ScreenStateModule';
import type { ScreenStateValue } from '../../modules/screen-state/src/ScreenState.types';

// 네이티브 잠금 감지 가능 여부 — 웹/Expo Go에서는 false (이탈은 전부 '앱 전환'으로 차감)
export const lockDetectionAvailable = ScreenStateModule != null;

export function subscribeScreenState(
  listener: (state: ScreenStateValue) => void,
): () => void {
  if (!ScreenStateModule) return () => {};
  const subscription = ScreenStateModule.addListener('onScreenState', ({ state }) =>
    listener(state),
  );
  return () => subscription.remove();
}
