import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { authApi, errorMessage } from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { GoogleButton } from '@/components/GoogleButton';
import { Button, Segmented, T, TextField } from '@/components/ui';
import { validateRegister } from '@/lib/validation';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';

type Gender = 'L' | 'P';

export default function Register() {
  const { c } = useTheme();
  const completeLogin = useAuth((s) => s.completeLogin);
  const [f, setF] = useState({ nama_lengkap: '', username: '', email: '', password: '', jenis_kelamin: 'L' as Gender });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    const next = { ...f, [k]: v };
    setF(next);
    if (touched) setErrors(validateRegister(next)); // validasi real-time setelah submit pertama
  };

  const submit = async () => {
    setTouched(true);
    const e = validateRegister(f);
    setErrors(e);
    setServerError('');
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      const res = await authApi.register({ ...f, username: f.username.trim(), email: f.email.trim().toLowerCase(), nama_lengkap: f.nama_lengkap.trim() });
      if (res?.access_token) await completeLogin(res);
      else await completeLogin(await authApi.login(f.username, f.password));
    } catch (err) {
      setServerError(errorMessage(err, 'Pendaftaran gagal. Periksa data Anda.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader title="Daftar Akun" subtitle="Tabik pun · BPS Provinsi Lampung" back />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          <T muted size={14}>
            Buat akun untuk menyimpan riwayat chatbot, bertanya di forum, dan mengajukan konsultasi Zoom.
          </T>
          <TextField label="Nama lengkap" placeholder="Nama sesuai identitas" autoComplete="name" value={f.nama_lengkap} onChangeText={(v) => set('nama_lengkap', v)} error={errors.nama_lengkap} />
          <TextField label="Username" placeholder="huruf kecil, angka, garis bawah" autoCapitalize="none" autoCorrect={false} value={f.username} onChangeText={(v) => set('username', v)} error={errors.username} />
          <TextField label="Email" placeholder="nama@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={f.email} onChangeText={(v) => set('email', v)} error={errors.email} />
          <TextField label="Password" placeholder="Minimal 8 karakter" secureToggle autoComplete="new-password" textContentType="newPassword" value={f.password} onChangeText={(v) => set('password', v)} error={errors.password} hint="Minimal 8 karakter" />
          <View>
            <T w="semibold" size={13} style={{ marginBottom: 6 }}>
              Jenis kelamin
            </T>
            <Segmented<Gender>
              value={f.jenis_kelamin}
              onChange={(v) => set('jenis_kelamin', v)}
              options={[
                { key: 'L', label: 'Laki-laki' },
                { key: 'P', label: 'Perempuan' },
              ]}
            />
          </View>
          {serverError ? (
            <T size={13} color={c.danger} accessibilityLiveRegion="assertive">
              {serverError}
            </T>
          ) : null}
          <Button title="Daftar" onPress={submit} loading={loading} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            <T size={13} muted>
              atau
            </T>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          </View>
          <GoogleButton label="Daftar dengan Google" />
          <Button title="Sudah punya akun? Masuk" variant="ghost" onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
