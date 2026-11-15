import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Token JWT HANYA disimpan di Secure Storage (Keychain iOS / Keystore Android),
 * bukan AsyncStorage — sesuai PRD §8.
 */
const ACCESS_KEY = 'talita.access_token';
const REFRESH_KEY = 'talita.refresh_token';

export const tokenStore = {
  async get() {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    return { access, refresh };
  },
  async set(access: string, refresh?: string | null) {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};

/** Preferensi & cache non-sensitif. */
export const prefs = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) as T);
    } catch {
      return fallback;
    }
  },
  async set(key: string, value: unknown) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* penyimpanan penuh / tidak tersedia: abaikan, ini hanya cache */
    }
  },
  async remove(key: string) {
    await AsyncStorage.removeItem(key);
  },
};

export const KEYS = {
  onboarded: 'talita.onboarded',
  forumCache: 'talita.cache.forum',
  chatCache: (sessionId: number | string) => `talita.cache.chat.${sessionId}`,
  sessionsCache: 'talita.cache.chat.sessions',
  notifAsked: 'talita.notif.asked',
};

/** Hapus semua cache milik user (dipanggil saat logout). */
export async function clearUserCache() {
  const all = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(all.filter((k) => k.startsWith('talita.cache.')));
}
