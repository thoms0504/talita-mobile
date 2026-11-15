import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ArrowUp, Camera, ChevronRight, Headphones, Info, LogOut, Moon, Pencil, Users, Video, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatApi, forumApi } from '@/api';
import { Siger, Zigzag } from '@/components/Siger';
import { Avatar, Button, T } from '@/components/ui';
import { WEB_ORIGIN } from '@/config';
import { formatNumber } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { useSettings, type NotifCategory } from '@/store/settings';
import { brand, useTheme } from '@/theme';

const NOTIF: { key: NotifCategory; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'zoom', label: 'Status pengajuan Zoom', icon: Video, color: brand.zoom },
  { key: 'forum', label: 'Jawaban di forum', icon: Users, color: brand.orangeStrong },
  { key: 'admin', label: 'Pesan dari admin', icon: Headphones, color: brand.support },
  { key: 'vote', label: 'Vote pertanyaan', icon: ArrowUp, color: '#B45309' },
];

export default function ProfileScreen() {
  const { c, gradient, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { themeMode, setThemeMode, notif, setNotif } = useSettings();
  const [counts, setCounts] = useState<{ q?: number; s?: number }>({});

  useEffect(() => {
    forumApi.myQuestions().then((q) => setCounts((x) => ({ ...x, q: q.length }))).catch(() => {});
    chatApi.sessions().then((s) => setCounts((x) => ({ ...x, s: s.length }))).catch(() => {});
  }, []);

  const confirmLogout = () =>
    Alert.alert('Keluar dari akun?', 'Anda perlu masuk kembali untuk memakai layanan TALITA-NG.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void signOut() },
    ]);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 32 }}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center', overflow: 'hidden' }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -20, top: insets.top + 10 }}>
          <Siger width={130} variant="mono" opacity={0.12} />
        </View>
        <T w="bold" size={19} color="#FFFFFF" style={{ alignSelf: 'flex-start' }} accessibilityRole="header">
          Profil Saya
        </T>
        <View style={{ marginTop: 18 }}>
          <View style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 32 }}>
            <Avatar name={user?.nama_lengkap ?? user?.username} url={user?.avatar_url} size={88} radius={29} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ganti foto profil"
            onPress={() => router.push('/profile/edit')}
            style={{ position: 'absolute', right: -6, bottom: -6, width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 3 }}
          >
            <Camera size={19} color={brand.orange} />
          </Pressable>
        </View>
        <T w="extrabold" size={20} color="#FFFFFF" style={{ marginTop: 14 }}>
          {user?.nama_lengkap ?? user?.username ?? '-'}
        </T>
        <T size={13} color="#FDE68A">
          @{user?.username} · {user?.email}
        </T>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <Zigzag />
        </View>
      </LinearGradient>

      <View style={{ flexDirection: 'row', gap: 12, margin: 16 }}>
        <StatBox value={counts.q} label="Pertanyaan forum" color={c.primary} />
        <StatBox value={counts.s} label="Sesi chatbot" color={isDark ? '#C4B5FD' : '#6D28D9'} />
      </View>

      <Group>
        <Row icon={Pencil} color={brand.orangeStrong} label="Edit profil" onPress={() => router.push('/profile/edit')} />
        <Row icon={Headphones} color={brand.support} label="Chat Admin" onPress={() => router.push('/support')} />
        <Row
          icon={Moon}
          color="#4338CA"
          label="Mode gelap"
          right={<Switch accessibilityLabel="Mode gelap" value={isDark} onValueChange={(v) => setThemeMode(v ? 'dark' : 'light')} trackColor={{ true: c.primary, false: '#D6D3D1' }} thumbColor="#FFFFFF" />}
        />
        {themeMode !== 'system' ? <Row icon={Moon} color="#78716C" label="Ikuti tema sistem" onPress={() => setThemeMode('system')} /> : null}
      </Group>

      <T w="bold" size={12} muted style={{ marginTop: 18, marginBottom: 6, marginHorizontal: 20, letterSpacing: 1 }}>
        NOTIFIKASI
      </T>
      <Group>
        {NOTIF.map((n) => (
          <Row
            key={n.key}
            icon={n.icon}
            color={n.color}
            label={n.label}
            right={<Switch accessibilityLabel={n.label} value={notif[n.key]} onValueChange={(v) => setNotif(n.key, v)} trackColor={{ true: c.primary, false: '#D6D3D1' }} thumbColor="#FFFFFF" />}
          />
        ))}
      </Group>

      <Group style={{ marginTop: 18 }}>
        <Row icon={Info} color="#78716C" label="Tentang TALITA-NG" onPress={() => WebBrowser.openBrowserAsync(WEB_ORIGIN)} />
      </Group>

      <View style={{ padding: 16 }}>
        <Button title="Keluar" icon={LogOut} variant="danger" onPress={confirmLogout} />
        <T muted size={12} style={{ textAlign: 'center', marginTop: 14 }}>
          TALITA-NG Mobile v1.0 · BPS Provinsi Lampung
        </T>
      </View>
    </ScrollView>
  );
}

function StatBox({ value, label, color }: { value?: number; label: string; color: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, padding: 14 }} accessible accessibilityLabel={`${label}: ${value ?? 'memuat'}`}>
      <T w="extrabold" size={24} color={color}>
        {value == null ? '–' : formatNumber(value)}
      </T>
      <T muted size={12}>
        {label}
      </T>
    </View>
  );
}

function Group({ children, style }: { children: ReactNode; style?: object }) {
  const { c } = useTheme();
  return <View style={[{ marginHorizontal: 16, backgroundColor: c.surface, borderRadius: 20, borderWidth: 1, borderColor: c.border, overflow: 'hidden' }, style]}>{children}</View>;
}

function Row({ icon: Icon, color, label, onPress, right }: { icon: LucideIcon; color: string; label: string; onPress?: () => void; right?: ReactNode }) {
  const { c } = useTheme();
  const content = (
    <>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: color + '1F', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={19} color={color} />
      </View>
      <T w="semibold" size={15} style={{ flex: 1 }}>
        {label}
      </T>
      {right ?? <ChevronRight size={18} color={c.textSubtle} />}
    </>
  );
  const style = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingHorizontal: 14, minHeight: 58, borderBottomWidth: 1, borderBottomColor: c.border };
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, { opacity: pressed ? 0.7 : 1 }]}>
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}
