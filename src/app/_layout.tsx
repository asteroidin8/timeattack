import '../global.css';

import {
  BarlowCondensed_500Medium_Italic,
  BarlowCondensed_600SemiBold_Italic,
  useFonts,
} from '@expo-google-fonts/barlow-condensed';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { cssInterop } from 'nativewind';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

// SafeAreaView는 코어 컴포넌트가 아니라서 className을 수동으로 연결해야 한다
cssInterop(SafeAreaView, { className: 'style' });

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BarlowCondensed_500Medium_Italic,
    BarlowCondensed_600SemiBold_Italic,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#FEFDFB' },
        }}
      />
      <StatusBar style="dark" />
    </>
  );
}
