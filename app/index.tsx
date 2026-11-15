import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { Siger, Zigzag } from '@/components/Siger';
import { T } from '@/components/ui';
import { KEYS, prefs } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { headerGradient } from '@/theme/colors';

let shownOnce = false;

/**
 * Splash (PRD F-01): logo BPS + logo TALITA, ornamen Siger, ±2 detik.
 * Lalu: belum onboarding → onboarding; token valid → Beranda; selain itu → Login.
 */
export default function Splash() {
  const status = useAuth((s) => s.status);
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const reduce = await AccessibilityInfo.isReduceMotionEnabled();
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: reduce ? 0 : 500, useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: reduce ? 0 : 600, useNativeDriver: true }),
      ]).start();
      const [onboarded] = await Promise.all([prefs.get(KEYS.onboarded, false), new Promise((r) => setTimeout(r, shownOnce ? 0 : 2000))]);
      shownOnce = true;
      if (cancelled) return;
      if (status === 'signedIn') router.replace('/(tabs)');
      else if (!onboarded) router.replace('/onboarding');
      else router.replace('/(auth)/login');
    })();
    return () => {
      cancelled = true;
    };
  }, [status, fade, lift]);

  return (
    <LinearGradient colors={headerGradient.light} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.root}>
      <View style={styles.top}>
        <Zigzag />
      </View>
      <Animated.View style={{ alignItems: 'center', opacity: fade, transform: [{ translateY: lift }] }}>
        <View style={styles.logos} accessible accessibilityLabel="Logo BPS dan logo TALITA-NG">
          <Image source={require('../assets/images/logo-bps.png')} style={{ width: 88, height: 66 }} contentFit="contain" />
          <View style={styles.divider} />
          <Image source={require('../assets/images/talita-logo.png')} style={{ width: 96, height: 96, borderRadius: 48 }} contentFit="cover" />
        </View>
        <T w="semibold" size={15} color="#FDE68A" style={{ marginTop: 30, letterSpacing: 0.5 }}>
          Tabik pun!
        </T>
        <T w="extrabold" size={38} color="#FFFFFF" style={{ marginTop: 4, letterSpacing: -1, lineHeight: 46 }}>
          TALITA-NG
        </T>
        <T size={15} color="rgba(255,255,255,0.92)" style={{ textAlign: 'center' }}>
          Badan Pusat Statistik Provinsi Lampung
        </T>
        <View style={{ marginTop: 26 }}>
          <Siger width={170} />
        </View>
      </Animated.View>
      <T w="semibold" size={13} color="#FDE68A" style={styles.motto}>
        SAI BUMI RUWA JURAI
      </T>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  logos: {
    flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 16, paddingHorizontal: 22, borderRadius: 32, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 18 }, elevation: 10,
  },
  divider: { width: 1.5, height: 72, backgroundColor: '#F1E4D8' },
  motto: { position: 'absolute', bottom: 48, letterSpacing: 2 },
});
