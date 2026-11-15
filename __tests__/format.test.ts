import { formatClock, formatDate, formatNumber, formatTime, greeting, parseServerDate, relativeTime } from '../src/lib/format';

describe('format (lokal Indonesia, WIB)', () => {
  it('memakai titik sebagai pemisah ribuan', () => {
    expect(formatNumber(1234)).toBe('1.234');
    expect(formatNumber(1234567)).toBe('1.234.567');
    expect(formatNumber(70.5)).toBe('70,5');
    expect(formatNumber(0)).toBe('0');
  });
  it('menganggap waktu server tanpa zona sebagai WIB', () => {
    expect(parseServerDate('2026-03-17T08:00:00')!.toISOString()).toBe('2026-03-17T01:00:00.000Z');
    expect(formatTime('2026-03-17T08:00:00')).toBe('08:00 WIB');
  });
  it('menghormati zona eksplisit', () => {
    expect(formatTime('2026-03-17T01:00:00Z')).toBe('08:00 WIB');
  });
  it('format tanggal DD MMMM YYYY', () => {
    expect(formatDate('2026-11-14')).toBe('14 November 2026');
    expect(formatDate('2026-11-16', { weekday: true })).toBe('Senin, 16 November 2026');
    expect(formatDate(null)).toBe('-');
  });
  it('jam ringkas', () => {
    expect(formatClock('09:30:00')).toBe('09.30');
  });
  it('waktu relatif', () => {
    const now = new Date('2026-11-14T05:00:00Z');
    expect(relativeTime('2026-11-14T11:58:00', now)).toBe('2 menit lalu');
    expect(relativeTime('2026-10-16T09:01:39', now)).toBe('29 hari lalu');
  });
  it('sapaan berdasarkan jam WIB', () => {
    expect(greeting(new Date('2026-11-14T00:30:00Z'))).toBe('Selamat pagi'); // 07.30 WIB
    expect(greeting(new Date('2026-11-14T05:00:00Z'))).toBe('Selamat siang'); // 12.00 WIB
    expect(greeting(new Date('2026-11-14T09:00:00Z'))).toBe('Selamat sore'); // 16.00 WIB
    expect(greeting(new Date('2026-11-14T13:00:00Z'))).toBe('Selamat malam'); // 20.00 WIB
  });
});
