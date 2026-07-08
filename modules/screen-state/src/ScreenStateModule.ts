import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { ScreenStateEvents } from './ScreenState.types';

declare class ScreenStateModule extends NativeModule<ScreenStateEvents> {}

// Expo Go 등 네이티브 모듈이 없는 환경에서는 null — 호출부에서 폴백 처리
export default requireOptionalNativeModule<ScreenStateModule>('ScreenState');
