/**
 * Konfigurasi runtime. Semua nilai bisa diganti lewat file .env (lihat .env.example).
 * Backend FastAPI dipakai bersama oleh web dan mobile.
 */
const trimSlash = (s: string) => s.replace(/\/+$/, '');

export const API_ORIGIN = trimSlash(process.env.EXPO_PUBLIC_API_URL ?? 'https://talita.statapps.dev');
export const API_BASE = `${API_ORIGIN}/api`;
export const WEB_ORIGIN = API_ORIGIN;

export const SOCKET_URL = trimSlash(process.env.EXPO_PUBLIC_SOCKET_URL ?? API_ORIGIN);
export const SOCKET_PATH = process.env.EXPO_PUBLIC_SOCKET_PATH ?? '/socket.io';

export const GOOGLE_CLIENT_IDS = {
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
};

/** Batas ukuran unggahan dari HP (koneksi mobile lebih lambat). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Kantor BPS Provinsi Lampung (ditampilkan di Beranda). */
export const OFFICE = {
  name: 'Kantor BPS Provinsi Lampung',
  address: 'Jl. Basuki Rahmat No. 54, Teluk Betung, Bandar Lampung, Lampung 35211',
  hours: 'Sen–Kam 08.00–15.30 · Jum 08.00–16.00 WIB',
  phone: '(0721) 482869',
  mapsQuery: 'BPS Provinsi Lampung, Jl. Basuki Rahmat No. 54 Bandar Lampung',
};
