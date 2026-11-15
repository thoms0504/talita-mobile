import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'system' | 'light' | 'dark';
export type NotifCategory = 'zoom' | 'forum' | 'admin' | 'vote';

type SettingsState = {
  themeMode: ThemeMode;
  notif: Record<NotifCategory, boolean>;
  setThemeMode: (m: ThemeMode) => void;
  setNotif: (k: NotifCategory, v: boolean) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'system',
      notif: { zoom: true, forum: true, admin: true, vote: true },
      setThemeMode: (themeMode) => set({ themeMode }),
      setNotif: (k, v) => set((s) => ({ notif: { ...s.notif, [k]: v } })),
    }),
    { name: 'talita.settings', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
