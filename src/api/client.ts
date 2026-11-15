import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { jwtDecode } from 'jwt-decode';
import { API_BASE } from '@/config';
import { tokenStore } from '@/lib/storage';

/**
 * Klien HTTP bersama. Interceptor:
 *  1. Menyisipkan `Authorization: Bearer <token>` dari Secure Storage.
 *  2. Refresh token otomatis bila akses token akan kedaluwarsa (< 2 menit) atau server membalas 401.
 *  3. Bila refresh gagal → event `unauthorized` → store auth melakukan logout.
 */
export const api = axios.create({ baseURL: API_BASE, timeout: 20000 });

/** Endpoint refresh. Jika backend belum punya, set ke null: user akan diminta login ulang saat token habis. */
export const REFRESH_PATH: string | null = '/auth/refresh';

type Listener = () => void;
const listeners = new Set<Listener>();
export const onUnauthorized = (fn: Listener) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emitUnauthorized = () => listeners.forEach((fn) => fn());

let cachedAccess: string | null = null;
export function setAccessTokenCache(t: string | null) {
  cachedAccess = t;
}
export async function getAccessToken() {
  if (cachedAccess) return cachedAccess;
  cachedAccess = (await tokenStore.get()).access;
  return cachedAccess;
}

function expiresSoon(token: string, withinSec = 120) {
  try {
    const { exp } = jwtDecode<{ exp?: number }>(token);
    return !!exp && exp * 1000 - Date.now() < withinSec * 1000;
  } catch {
    return false;
  }
}

let refreshing: Promise<string | null> | null = null;
export async function refreshAccessToken(): Promise<string | null> {
  if (!REFRESH_PATH) return null;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const { refresh } = await tokenStore.get();
    if (!refresh) return null;
    try {
      const res = await axios.post(`${API_BASE}${REFRESH_PATH}`, { refresh_token: refresh }, { timeout: 15000 });
      const access: string | undefined = res.data?.access_token;
      if (!access) return null;
      await tokenStore.set(access, res.data?.refresh_token ?? refresh);
      cachedAccess = access;
      return access;
    } catch {
      return null;
    } finally {
      setTimeout(() => (refreshing = null), 0);
    }
  })();
  return refreshing;
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = await getAccessToken();
  if (token && expiresSoon(token) && !config.url?.includes('/auth/')) {
    token = (await refreshAccessToken()) ?? token;
  }
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register') || original?.url?.includes('/auth/google');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      const fresh = await refreshAccessToken();
      if (fresh) {
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${fresh}` };
        return api(original);
      }
      emitUnauthorized();
    }
    return Promise.reject(error);
  },
);

/** Pesan error ramah pengguna dari error axios/FastAPI. */
export function errorMessage(e: unknown, fallback = 'Terjadi kesalahan. Coba lagi.'): string {
  const err = e as AxiosError<any>;
  if (err?.code === 'ECONNABORTED') return 'Koneksi lambat. Coba lagi sebentar lagi.';
  if (err?.message === 'Network Error' || (err?.isAxiosError && !err.response)) return 'Tidak ada koneksi internet.';
  const detail = err?.response?.data?.detail ?? err?.response?.data?.message;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  if (err?.response?.status === 401) return 'Sesi berakhir. Silakan masuk kembali.';
  if (err?.response?.status === 413) return 'Ukuran file terlalu besar.';
  return fallback;
}
