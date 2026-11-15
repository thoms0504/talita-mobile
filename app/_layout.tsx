import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { handleNotificationTap, registerForPush } from '@/lib/notifications';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const { c } = useTheme();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (fontsLoaded && status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, status]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  // Push: minta izin & kirim token setelah login (PRD F-09: "izin diminta saat pertama login").
  useEffect(() => {
    if (status === 'signedIn') void registerForPush();
  }, [status]);

  // Tap notifikasi → buka layar terkait (deep link tervalidasi).
  useEffect(() => {
    if (status !== 'signedIn') return;
    const last = Notifications.getLastNotificationResponse();
    if (last) handleNotificationTap(last);
    const sub = Notifications.addNotificationResponseReceivedListener(handleNotificationTap);
    return () => sub.remove();
  }, [status]);

  if (!fontsLoaded || status === 'loading') return null;

  const signedIn = status === 'signedIn';
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="forum/[id]" />
          <Stack.Screen name="forum/create" options={{ presentation: 'modal' }} />
          <Stack.Screen name="support" />
          <Stack.Screen name="profile/edit" />
        </Stack.Protected>
      </Stack>
    </SafeAreaProvider>
  );
}
