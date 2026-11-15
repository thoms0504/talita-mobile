/** Validasi input sebelum dikirim ke API (PRD §8 — Input Sanitization). */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isUsername = (v: string) => /^[a-zA-Z0-9_.]{3,30}$/.test(v.trim());

export function validateLogin(v: { username: string; password: string }) {
  const e: Record<string, string> = {};
  if (!v.username.trim()) e.username = 'Username wajib diisi';
  if (!v.password) e.password = 'Password wajib diisi';
  return e;
}

export function validateRegister(v: { nama_lengkap: string; username: string; email: string; password: string; jenis_kelamin: string }) {
  const e: Record<string, string> = {};
  if (v.nama_lengkap.trim().length < 3) e.nama_lengkap = 'Nama lengkap minimal 3 karakter';
  if (!isUsername(v.username)) e.username = '3–30 karakter: huruf, angka, titik atau garis bawah';
  if (!isEmail(v.email)) e.email = 'Format email belum valid';
  if (v.password.length < 8) e.password = 'Password minimal 8 karakter';
  if (!v.jenis_kelamin) e.jenis_kelamin = 'Pilih jenis kelamin';
  return e;
}

export function validateQuestion(v: { judul: string; deskripsi: string; tags: string[] }) {
  const e: Record<string, string> = {};
  if (v.judul.trim().length < 10) e.judul = 'Judul minimal 10 karakter agar jelas';
  if (v.judul.length > 150) e.judul = 'Judul maksimal 150 karakter';
  if (v.deskripsi.trim().length < 20) e.deskripsi = 'Jelaskan pertanyaan minimal 20 karakter';
  if (v.tags.length > 5) e.tags = 'Maksimal 5 tag';
  return e;
}

export function validateZoom(v: { nama_instansi: string; topik: string; tanggal: Date | null; jam_mulai: Date | null; jam_selesai: Date | null }, today = new Date()) {
  const e: Record<string, string> = {};
  if (!v.nama_instansi.trim()) e.nama_instansi = 'Nama instansi wajib diisi';
  if (!v.topik.trim()) e.topik = 'Pilih atau tulis topik konsultasi';
  if (!v.tanggal) e.tanggal = 'Pilih tanggal';
  else {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const d = new Date(v.tanggal.getFullYear(), v.tanggal.getMonth(), v.tanggal.getDate());
    if (d < t) e.tanggal = 'Tanggal minimal hari ini';
  }
  if (!v.jam_mulai) e.jam_mulai = 'Pilih jam mulai';
  if (!v.jam_selesai) e.jam_selesai = 'Pilih jam selesai';
  if (v.jam_mulai && v.jam_selesai) {
    const a = v.jam_mulai.getHours() * 60 + v.jam_mulai.getMinutes();
    const b = v.jam_selesai.getHours() * 60 + v.jam_selesai.getMinutes();
    if (b <= a) e.jam_selesai = 'Jam selesai harus setelah jam mulai';
  }
  return e;
}

/** Bersihkan teks bebas: buang karakter kontrol, rapikan spasi berlebih di ujung. */
export const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
