import '../global.css';

import {
  BarlowCondensed_500Medium_Italic,
  BarlowCondensed_600SemiBold_Italic,
  useFonts,
} from '@expo-google-fonts/barlow-condensed';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

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
