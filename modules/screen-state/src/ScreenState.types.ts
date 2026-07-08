// off: 화면 꺼짐/잠금 시작, on: 화면 켜짐(잠금화면 표시), present: 잠금 해제 완료
export type ScreenStateValue = 'off' | 'on' | 'present';

export type ScreenStateEvents = {
  onScreenState: (payload: { state: ScreenStateValue }) => void;
};
