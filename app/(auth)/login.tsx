import { Image } from 'expo-image';
import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Lock, User } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi, errorMessage } from '@/api';
import { GoogleButton } from '@/components/GoogleButton';
import { Siger } from '@/components/Siger';
import { Button, T, TextField } from '@/components/ui';
import { WEB_ORIGIN } from '@/config';
import { validateLogin } from '@/lib/validation';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';

export default function Login() {
  const { c } = useTheme();
  const completeLogin = useAuth((s) => s.completeLogin);
  const [form, setForm] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const pwRef = useRef<TextInput>(null);

  const submit = async () => {
    const e = validateLogin(form);
    setErrors(e);
    setServerError('');
    if (Object.keys(e).length) return;
    setLoading(true);
    try {
      await completeLogin(await authApi.login(form.username, form.password));
    } catch (err) {
      setServerError(errorMessage(err, 'Username atau password salah.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image source={require('../../assets/images/talita-logo.png')} style={{ width: 48, height: 48, borderRadius: 24 }} />
            <T w="extrabold" size={20}>
              TALITA-NG
            </T>
          </View>
          <View style={{ marginTop: 28, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' }}>
            <Siger width={26} />
            <T w="semibold" size={12} color="#92400E">
              Tabik pun · BPS Provinsi Lampung
            </T>
          </View>
          <T w="extrabold" size={32} style={{ marginTop: 16, letterSpacing: -0.8, lineHeight: 40 }} accessibilityRole="header">
            Masuk
          </T>
          <T muted size={15}>
            Selamat datang kembali!
          </T>

          <View style={{ marginTop: 28, gap: 16 }}>
            <TextField
              label="Username"
              icon={User}
              placeholder="Masukkan username Anda"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              value={form.username}
              onChangeText={(username) => setForm((f) => ({ ...f, username }))}
              onSubmitEditing={() => pwRef.current?.focus()}
              error={errors.username}
            />
            <TextField
              ref={pwRef}
              label="Password"
              icon={Lock}
              placeholder="••••••••"
              secureToggle
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              value={form.password}
              onChangeText={(password) => setForm((f) => ({ ...f, password }))}
              onSubmitEditing={submit}
              error={errors.password}
            />
            <Pressable accessibilityRole="link" onPress={() => WebBrowser.openBrowserAsync(`${WEB_ORIGIN}/login`)} style={{ alignSelf: 'flex-end', paddingVertical: 6 }}>
              <T w="semibold" size={13} color={c.primary}>
                Lupa password?
              </T>
            </Pressable>
            {serverError ? (
              <T size={13} color={c.danger} accessibilityLiveRegion="assertive">
                {serverError}
              </T>
            ) : null}
            <Button title="Masuk" onPress={submit} loading={loading} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
            <T size={13} muted>
              atau
            </T>
            <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
          </View>
          <GoogleButton />

          <View style={{ marginTop: 'auto', paddingTop: 28, flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
            <T muted size={14}>
              Belum punya akun?
            </T>
            <Link href="/(auth)/register" accessibilityRole="link">
              <T w="bold" size={14} color={c.primary}>
                Daftar sekarang
              </T>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
