import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { authApi } from '@/api';
import { useSettings, type NotifCategory } from '@/store/settings';

/**
 * Push notification (PRD F-09).
 * Token native perangkat (FCM di Android, APNs di iOS) dikirim ke backend lewat POST /api/auth/fcm-token.
 * Payload `data` yang diharapkan dari backend: { category: 'zoom'|'forum'|'admin'|'vote', url: '/forum/12' }.
 */
Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const category = n.request.content.data?.category as NotifCategory | undefined;
    const allowed = !category || useSettings.getState().notif[category] !== false;
    return { shouldShowBanner: allowed, shouldShowList: allowed, shouldPlaySound: allowed, shouldSetBadge: false };
  },
});

export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'TALITA-NG',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#C2410C',
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return null;
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    await authApi.registerPushToken(String(token.data), token.type);
    return String(token.data);
  } catch {
    return null; // backend belum punya endpoint atau Firebase belum dikonfigurasi
  }
}

/** Hanya rute internal yang dikenal yang boleh dibuka dari notifikasi (PRD §8 — validasi deeplink). */
const ALLOWED = [/^\/forum\/\d+$/, /^\/zoom$/, /^\/support$/, /^\/chatbot$/, /^\/profile$/, /^\/$/];
export function safeRoute(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  let path = url;
  if (/^[a-z]+:\/\//i.test(url)) {
    const m = url.match(/^(?:talitang:\/\/|https:\/\/talita\.statapps\.dev)(\/[^?#]*)?/i);
    if (!m) return null;
    path = m[1] ?? '/';
  }
  return ALLOWED.some((r) => r.test(path)) ? path : null;
}

export function handleNotificationTap(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data ?? {};
  const route = safeRoute(data.url) ?? (data.category === 'zoom' ? '/zoom' : data.category === 'admin' ? '/support' : null);
  if (route) router.push(route as any);
}

/** Notifikasi lokal untuk pesan admin saat app di background (PRD F-07). */
export async function notifyLocal(title: string, body: string, data: Record<string, unknown>) {
  const category = data.category as NotifCategory | undefined;
  if (category && useSettings.getState().notif[category] === false) return;
  await Notifications.scheduleNotificationAsync({ content: { title, body, data }, trigger: null });
}
