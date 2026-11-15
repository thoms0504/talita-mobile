/**
 * Format lokal Indonesia (PRD §9): tanggal `DD MMMM YYYY`, jam `HH:mm WIB`,
 * pemisah ribuan titik. Semua tampilan memakai zona WIB (UTC+7).
 * Ditulis manual agar tidak bergantung pada dukungan Intl di Hermes.
 */
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Backend mengirim waktu tanpa zona (mis. "2026-03-17T08:00:00").
 * Waktu seperti itu dianggap WIB; waktu ber-zona (Z / +hh:mm) dihormati apa adanya.
 */
export function parseServerDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const iso = value.includes('T') || value.includes(' ') ? value.replace(' ', 'T') : `${value}T00:00:00`;
  const d = new Date(hasZone ? iso : `${iso}+07:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Komponen tanggal dalam WIB, terlepas dari zona waktu perangkat. */
function wibParts(d: Date) {
  const w = new Date(d.getTime() + WIB_OFFSET_MS);
  return { y: w.getUTCFullYear(), m: w.getUTCMonth(), d: w.getUTCDate(), day: w.getUTCDay(), h: w.getUTCHours(), min: w.getUTCMinutes() };
}

export function formatDate(value: Parameters<typeof parseServerDate>[0], opts: { weekday?: boolean; short?: boolean } = {}) {
  const d = parseServerDate(value);
  if (!d) return '-';
  const p = wibParts(d);
  const month = opts.short ? BULAN_PENDEK[p.m] : BULAN[p.m];
  const base = `${p.d} ${month} ${p.y}`;
  return opts.weekday ? `${HARI[p.day]}, ${base}` : base;
}

export function formatTime(value: Parameters<typeof parseServerDate>[0], withZone = true) {
  const d = parseServerDate(value);
  if (!d) return '-';
  const p = wibParts(d);
  return `${pad(p.h)}:${pad(p.min)}${withZone ? ' WIB' : ''}`;
}

/** "HH:mm[:ss]" → "HH.mm" */
export function formatClock(hhmm: string | null | undefined) {
  if (!hhmm) return '-';
  const [h, m] = hhmm.split(':');
  return `${pad(Number(h))}.${pad(Number(m ?? 0))}`;
}

export function formatNumber(n: number | null | undefined) {
  if (n == null || isNaN(n)) return '0';
  const [int, dec] = Math.abs(n).toString().split('.');
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (n < 0 ? '-' : '') + (dec ? `${withDots},${dec}` : withDots);
}

export function relativeTime(value: Parameters<typeof parseServerDate>[0], now = new Date()) {
  const d = parseServerDate(value);
  if (!d) return '';
  const s = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return 'baru saja';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const day = Math.floor(h / 24);
  if (day < 30) return `${day} hari lalu`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon} bulan lalu`;
  return `${Math.floor(mon / 12)} tahun lalu`;
}

/** Sapaan berdasarkan jam WIB. */
export function greeting(now = new Date()) {
  const h = wibParts(now).h;
  if (h >= 4 && h < 11) return 'Selamat pagi';
  if (h >= 11 && h < 15) return 'Selamat siang';
  if (h >= 15 && h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/** Date lokal → "YYYY-MM-DD" (format yang dikirim ke API Zoom). */
export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Date lokal → "HH:mm". */
export function toHHmm(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export function formatBytes(b?: number | null) {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
