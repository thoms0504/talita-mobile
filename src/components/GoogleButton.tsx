import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { authApi, errorMessage } from '@/api';
import { GOOGLE_CLIENT_IDS } from '@/config';
import { useAuth } from '@/store/auth';
import { useTheme } from '@/theme';
import { T } from './ui';

WebBrowser.maybeCompleteAuthSession();

/**
 * Login Google (PRD F-02, mitigasi risiko §12): expo-auth-session meminta ID token Google
 * di browser in-app, lalu backend menukarnya dengan JWT TALITA lewat POST /api/auth/google.
 */
export function GoogleButton({ label = 'Masuk dengan Google' }: { label?: string }) {
  const { c } = useTheme();
  const completeLogin = useAuth((s) => s.completeLogin);
  const [busy, setBusy] = useState(false);
  const configured = !!(GOOGLE_CLIENT_IDS.android || GOOGLE_CLIENT_IDS.ios || GOOGLE_CLIENT_IDS.web);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: GOOGLE_CLIENT_IDS.android || undefined,
    iosClientId: GOOGLE_CLIENT_IDS.ios || undefined,
    webClientId: GOOGLE_CLIENT_IDS.web || undefined,
    clientId: GOOGLE_CLIENT_IDS.web || 'not-configured',
  });

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error') Alert.alert('Login Google', 'Login Google gagal. Coba lagi.');
      return;
    }
    const idToken = response.params?.id_token ?? response.authentication?.idToken;
    if (!idToken) return;
    setBusy(true);
    authApi
      .google(idToken)
      .then(completeLogin)
      .catch((e) => Alert.alert('Login Google', errorMessage(e, 'Login Google gagal.')))
      .finally(() => setBusy(false));
  }, [response, completeLogin]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !configured || !request || busy, busy }}
      disabled={!request || busy}
      onPress={() => (configured ? promptAsync() : Alert.alert('Login Google', 'Client ID Google belum diisi di file .env.'))}
      style={({ pressed }) => ({
        height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: c.inputBorder, backgroundColor: c.surface,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: pressed || busy ? 0.7 : 1,
      })}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderTopColor: '#4285F4', borderRightColor: '#34A853', borderBottomColor: '#FBBC05', borderLeftColor: '#EA4335', alignItems: 'center', justifyContent: 'center' }}>
        <T w="extrabold" size={11} color="#4285F4" style={{ lineHeight: 14 }}>
          G
        </T>
      </View>
      <T w="semibold" size={15}>
        {busy ? 'Memproses…' : label}
      </T>
    </Pressable>
  );
}
