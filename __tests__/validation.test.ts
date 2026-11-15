import { clean, isEmail, validateQuestion, validateRegister, validateZoom } from '../src/lib/validation';

describe('validasi', () => {
  it('email', () => {
    expect(isEmail('a@b.id')).toBe(true);
    expect(isEmail('rahmat@contoh')).toBe(false);
  });
  it('registrasi: password minimal 8 karakter', () => {
    const e = validateRegister({ nama_lengkap: 'Rahmat Hidayat', username: 'rahmat_h', email: 'r@x.id', password: 'rahasia', jenis_kelamin: 'L' });
    expect(e.password).toBeDefined();
    expect(Object.keys(e)).toEqual(['password']);
  });
  it('pertanyaan forum: maksimal 5 tag', () => {
    const e = validateQuestion({ judul: 'Perbedaan data kemiskinan', deskripsi: 'x'.repeat(30), tags: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(e.tags).toBeDefined();
  });
  it('zoom: tanggal minimal hari ini & jam selesai > jam mulai', () => {
    const today = new Date(2026, 10, 14, 10);
    const e = validateZoom(
      { nama_instansi: 'Bappeda', topik: 'Inflasi/PDRB', tanggal: new Date(2026, 10, 13), jam_mulai: new Date(2026, 10, 16, 10), jam_selesai: new Date(2026, 10, 16, 9, 30) },
      today,
    );
    expect(e.tanggal).toBe('Tanggal minimal hari ini');
    expect(e.jam_selesai).toBe('Jam selesai harus setelah jam mulai');
    const ok = validateZoom({ nama_instansi: 'Bappeda', topik: 'Inflasi/PDRB', tanggal: new Date(2026, 10, 14), jam_mulai: new Date(2026, 10, 14, 10), jam_selesai: new Date(2026, 10, 14, 11) }, today);
    expect(ok).toEqual({});
  });
  it('clean membuang karakter kontrol', () => {
    expect(clean('  halo\u0007 ')).toBe('halo');
  });
});
