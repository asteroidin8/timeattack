import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface SettingsState {
  // 복원 완료 전 기본값이 화면에 잠깐 보이는 것을 막는 게이트 (0-4 지뢰 표 패턴)
  hydrated: boolean;
  // 세션 알림(타임 오버 + 초과 리마인더) 예약 여부
  sessionAlarmEnabled: boolean;
  // 절전 화면(AOD풍): 세션 중 무터치 30초 후 어두운 미니멀 타이머로 전환
  aodEnabled: boolean;
  setHydrated: () => void;
  setSessionAlarmEnabled: (enabled: boolean) => void;
  setAodEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hydrated: false,
      sessionAlarmEnabled: true,
      aodEnabled: true,

      setHydrated: () => set({ hydrated: true }),
      setSessionAlarmEnabled: (enabled) => set({ sessionAlarmEnabled: enabled }),
      setAodEnabled: (enabled) => set({ aodEnabled: enabled }),
    }),
    {
      name: 'timeattack-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sessionAlarmEnabled: state.sessionAlarmEnabled,
        aodEnabled: state.aodEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
