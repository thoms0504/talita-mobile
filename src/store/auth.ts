import { create } from 'zustand';
import { authApi, onUnauthorized, type AuthResponse, type User } from '@/api';
import { setAccessTokenCache } from '@/api/client';
import { clearUserCache, tokenStore } from '@/lib/storage';
import { disconnectSocket } from '@/lib/socket';

type Status = 'loading' | 'signedIn' | 'signedOut';

type AuthState = {
  status: Status;
  user: User | null;
  /** Dipanggil sekali saat app dibuka: token valid → langsung ke Beranda (PRD F-01). */
  bootstrap: () => Promise<void>;
  completeLogin: (res: AuthResponse) => Promise<void>;
  setUser: (u: User) => void;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  user: null,

  bootstrap: async () => {
    const { access } = await tokenStore.get();
    if (!access) return set({ status: 'signedOut', user: null });
    setAccessTokenCache(access);
    try {
      const user = await authApi.me(); // interceptor akan refresh bila perlu
      set({ status: 'signedIn', user });
    } catch (e: any) {
      if (!e?.response) {
        // Offline: tetap masuk dengan token tersimpan; data akan dimuat ulang saat online.
        set({ status: 'signedIn' });
      } else {
        await tokenStore.clear();
        setAccessTokenCache(null);
        set({ status: 'signedOut', user: null });
      }
    }
  },

  completeLogin: async (res) => {
    await tokenStore.set(res.access_token, res.refresh_token);
    setAccessTokenCache(res.access_token);
    const user = res.user ?? (await authApi.me());
    set({ status: 'signedIn', user });
  },

  setUser: (u) => set({ user: { ...(get().user ?? {}), ...u } as User }),

  signOut: async () => {
    await authApi.logout();
    disconnectSocket();
    await tokenStore.clear();
    await clearUserCache();
    setAccessTokenCache(null);
    set({ status: 'signedOut', user: null });
  },
}));

// Token tidak bisa diperbarui → keluar otomatis.
onUnauthorized(() => {
  if (useAuth.getState().status === 'signedIn') void useAuth.getState().signOut();
});
