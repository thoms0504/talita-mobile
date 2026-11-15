# TALITA-NG Mobile (Mode User)

Aplikasi Android & iOS untuk pengguna publik **TALITA-NG — BPS Provinsi Lampung**.
Admin tetap memakai web app di **talita.statapps.dev**; aplikasi ini memakai **backend FastAPI yang sama** (`/api/...` + Socket.IO).

Dibangun dengan **Expo (SDK 54) + Expo Router + TypeScript**, sesuai rekomendasi PRD §6.3/§7.1.

## Menjalankan

```bash
npm install
npx expo install --fix        # menyelaraskan versi paket dengan SDK Expo yang terpasang
cp .env.example .env          # isi Google Client ID bila memakai login Google
npx expo prebuild             # opsional; atau langsung:
npx expo run:android          # atau: npx expo run:ios
```

> Beberapa fitur memakai modul native (speech-to-text, push token, Google sign-in, pemilih tanggal),
> jadi gunakan **development build** (`expo run:*` atau `eas build --profile development`), bukan Expo Go.

Build rilis: `eas build -p android --profile production` / `eas build -p ios --profile production`.

Unit test logika bisnis (format WIB, validasi): `npm test`.

## Struktur

```
app/                      Rute (Expo Router)
  index.tsx               Splash: logo BPS + TALITA, Siger, ±2 dtk → onboarding / login / beranda
  onboarding.tsx          3 slide, tampil sekali
  (auth)/login, register  Username+password & Google OAuth
  (tabs)/                 Bottom nav 5 tab: Beranda, Chatbot, Forum, Zoom, Profil
  forum/[id], forum/create
  support.tsx             Chat Admin realtime (Socket.IO)
  profile/edit.tsx        Edit profil + foto (kamera/galeri, pratinjau)
src/
  api/                    Klien axios (JWT, auto-refresh) + semua endpoint & tipe
  components/             UI dasar, AppHeader (gradien + Siger + zigzag), Siger SVG, Markdown
  lib/                    storage (SecureStore), socket, notifikasi, format WIB, validasi
  store/                  zustand: auth, pengaturan (mode gelap, notifikasi)
  theme/                  Token warna TALITA-NG (terang & gelap)
```

## Pemetaan fitur PRD

| PRD | Implementasi |
|---|---|
| F-01 Splash & Onboarding | `app/index.tsx`, `app/onboarding.tsx` (flag di AsyncStorage) |
| F-02 Autentikasi | `app/(auth)/*`, `src/store/auth.ts`, `src/api/client.ts` (Bearer, refresh otomatis, logout saat 401) |
| F-03 Beranda | `app/(tabs)/index.tsx` — sapaan WIB, counter animasi dari `/api/public/stats`, 4 layanan, info kantor, FAB Chat Admin, pull-to-refresh |
| F-04 Chatbot | `app/(tabs)/chatbot.tsx` — drawer sesi, sesi baru, streaming (`expo/fetch`, SSE/teks), tombol stop, Markdown, chip saran, hapus sesi, cache offline |
| F-05 Forum | `app/(tabs)/forum.tsx`, `app/forum/*` — infinite scroll, cari, filter tag, Pertanyaan Saya, vote, jawab, buat, laporkan, bagikan |
| F-06 Zoom | `app/(tabs)/zoom.tsx` — form + validasi, slot terisi (daftar vertikal), riwayat + status, tombol Masuk Room Zoom, catatan admin |
| F-07 Chat Admin | `app/support.tsx` — Socket.IO (websocket + fallback polling), status admin, ✓/✓✓, lampiran gambar/PDF + pratinjau, notifikasi lokal saat background |
| F-08 Profil | `app/(tabs)/profile.tsx`, `app/profile/edit.tsx` |
| F-09 Push | `src/lib/notifications.ts` — izin setelah login, token ke backend, tap → deep link tervalidasi, per kategori |
| F-10 Mode gelap | `src/theme`, sakelar di Profil (atau ikuti sistem) |
| F-11 Speech-to-Text | `src/hooks/useSpeech.ts` (`expo-speech-recognition`, `id-ID`) |
| §7.4 Offline | Cache forum/chat/statistik + banner "Tidak ada koneksi" |
| §8 Keamanan | JWT di SecureStore, validasi input, whitelist deep link & tautan Zoom |

## Kontrak API

Bentuk data yang **sudah diverifikasi** dari respons publik talita.statapps.dev (14 Nov 2026):
`GET /api/public/stats`, `GET /api/forum/posts`, `GET /api/forum/posts/{id}`, `GET /api/forum/tags`, `GET /api/zoom/calendar`.
Field forum memakai nama backend (`judul`, `deskripsi`, `vote_count`, `answer_count`, `user_vote`, `author`).

Endpoint yang butuh login **belum bisa saya lihat langsung**; payload-nya mengikuti PRD dan semuanya ada di
satu file, `src/api/index.ts`, sehingga mudah disesuaikan dengan `backend/app/routers/`:

| Endpoint | Yang dikirim aplikasi | Perlu dicek |
|---|---|---|
| `POST /auth/login` | JSON `{username, password}` | Bila backend memakai `OAuth2PasswordRequestForm`, ganti ke form-urlencoded |
| `POST /auth/google` | `{id_token, credential}` | Nama field yang diterima backend |
| `POST /auth/refresh` | `{refresh_token}` | **Belum ada di PRD.** Jika tidak ada, set `REFRESH_PATH = null` di `src/api/client.ts` (user diminta login ulang saat token habis) |
| `POST /chat/sessions/{id}/messages` | `{content, message}` | Format stream (SSE `data:` / teks / JSON — ketiganya didukung) |
| `POST /forum/posts` | `{judul, deskripsi, tags: string[]}` | Tag berupa nama atau id |
| `POST /forum/posts/{id}/vote` | `{value, vote_type}` = 1 / -1 | Nama field |
| `POST /forum/posts/{id}/report` | `{reason}` | **Tidak tercantum di PRD**, tapi `report_count` ada di data |
| `POST /zoom/request` | `{nama_instansi, topik, keterangan, tanggal: YYYY-MM-DD, jam_mulai: HH:mm, jam_selesai}` | Format tanggal/jam |
| Socket.IO | `join_room`, `send_message {content, attachment_id}`, `typing`; mendengar `receive_message`, `admin_status`, `message_read` | Path (`/socket.io`) & cara auth (token dikirim via `auth` dan `query`) |

## Perubahan backend yang dibutuhkan

1. `POST /api/auth/fcm-token` — simpan device token (`{token, type, platform}`) dan kirim push dengan `data: {category: 'zoom'|'forum'|'admin'|'vote', url: '/forum/12'}`.
   Token yang dikirim adalah token native (FCM di Android, APNs di iOS). Untuk mengirim ke iOS lewat FCM, tambahkan Firebase (`@react-native-firebase/messaging`) atau gunakan Expo Push Service.
2. (Disarankan) `POST /api/auth/refresh`.
3. (Opsional) `view_count` dan `accepted_answer_id` pada post forum. Aplikasi sudah menampilkannya bila ada; tanpa itu badge "Terjawab" muncul bila ada ≥1 jawaban.
4. Batasi ukuran unggahan dari mobile (aplikasi membatasi 5 MB lampiran, 2 MB foto profil).

## Belum termasuk (untuk produksi)

- **SSL pinning** (PRD §8) butuh modul native tambahan, mis. `react-native-ssl-public-key-pinning`, dengan hash sertifikat domain BPS.
- Deteksi root/jailbreak (opsional di MVP).
- Lupa password membuka halaman web (sesuai PRD: placeholder MVP).
- Logo BPS yang dipakai berukuran kecil (88×66 px); ganti `assets/images/logo-bps.png` dengan versi resolusi tinggi atau SVG resmi.

## Identitas visual

Warna, gradien header oranye–merah, tepi zigzag emas, dan ornamen **Siger Pepadun 9 lekuk** (`src/components/Siger.tsx`, digambar ulang sebagai vektor) mengikuti web TALITA-NG.
Font: Plus Jakarta Sans. Warna teks/tombol memakai shade lebih gelap (#C2410C, #047857) agar kontras ≥ 4.5:1.
