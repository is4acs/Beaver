/**
 * Layout racine de l'application Beaver (Expo Router)
 * Vérifie l'onboarding et redirige vers le bon écran
 */
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { isOnboardingDone } from '../src/services/storageService';
import { COLORS } from '../src/utils/constants';

export default function RootLayout(): React.JSX.Element | null {
  const [isReady, setIsReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    const checkOnboarding = async (): Promise<void> => {
      const done = await isOnboardingDone();
      setOnboardingDone(done);
      setIsReady(true);
    };
    checkOnboarding();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator color={COLORS.white} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        initialRouteName={onboardingDone ? 'home' : 'index'}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </>
  );
}
