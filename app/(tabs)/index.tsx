import { LinearGradient } from 'expo-linear-gradient';
import { router, type Href } from 'expo-router';
import { Bell, Clock, Hash, Headphones, MapPin, MessageSquare, Sparkles, Users, Video, type LucideIcon } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Linking, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { publicApi, type PublicStats } from '@/api';
import { Siger, Zigzag } from '@/components/Siger';
import { Avatar, IconButton, OfflineBanner, T } from '@/components/ui';
import { OFFICE } from '@/config';
import { useOnline } from '@/hooks/useOnline';
import { formatNumber, greeting } from '@/lib/format';
import { prefs } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { brand, useTheme } from '@/theme';

const STATS_KEY = 'talita.cache.stats';

export default function HomeScreen() {
  const { c, gradient, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const online = useOnline();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await publicApi.stats();
      setStats(s);
      prefs.set(STATS_KEY, s);
    } catch {
      setStats((prev) => prev);
    }
  }, []);

  useEffect(() => {
    prefs.get<PublicStats | null>(STATS_KEY, null).then((s) => s && setStats((p) => p ?? s));
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = user?.nama_lengkap?.split(' ')[0] ?? user?.username ?? '';
  const card = isDark ? '#1F1B19' : '#FAF6F2';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={[c.primary]} />} contentContainerStyle={{ paddingBottom: 110 }}>
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 70, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -18, top: insets.top + 30 }}>
            <Siger width={150} variant="mono" opacity={0.12} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Buka profil" onPress={() => router.push('/(tabs)/profile')}>
              <Avatar name={user?.nama_lengkap ?? user?.username} url={user?.avatar_url} size={48} radius={16} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <T w="semibold" size={12} color="#FDE68A">
                Tabik pun{user?.username ? ` · @${user.username}` : ''}
              </T>
              <T w="extrabold" size={21} color="#FFFFFF" numberOfLines={1} accessibilityRole="header">
                {greeting()}
                {firstName ? `, ${firstName}` : ''}
              </T>
            </View>
            <IconButton icon={Bell} label="Notifikasi" color="#FFFFFF" bg="rgba(255,255,255,0.14)" onPress={() => router.push('/(tabs)/profile')} />
          </View>
          <T size={13} color="rgba(255,255,255,0.9)" style={{ marginTop: 14, maxWidth: 300 }}>
            Solusi cerdas & terpadu data statistik BPS Provinsi Lampung.
          </T>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <Zigzag />
          </View>
        </LinearGradient>

        <OfflineBanner visible={!online} />

        <View style={{ marginTop: -52, marginHorizontal: 16, backgroundColor: c.surface, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: c.border, shadowColor: '#7C2D12', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 4 }}>
          <T w="bold" size={11} color={isDark ? '#FDBA74' : c.primary} style={{ letterSpacing: 1.2 }}>
            RINGKASAN AKTIVITAS
          </T>
          <T w="bold" size={16}>
            Statistik Platform
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            <StatTile bg={card} icon={MessageSquare} color={brand.forum} label="Post Forum" value={stats?.forum.total_questions} />
            <StatTile bg={card} icon={Sparkles} color={brand.chatbot} label="Chatbot Query" value={stats?.chat.total_questions} />
            <StatTile bg={card} icon={Hash} color={brand.forum} label="Tren Forum" text={stats?.forum.top_words?.[0]?.text} textColor={isDark ? '#FDBA74' : c.primary} />
            <StatTile bg={card} icon={Sparkles} color={brand.chatbot} label="Topik Chat" text={stats?.chat.top_words?.[0]?.text} textColor={isDark ? '#C4B5FD' : '#6D28D9'} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
          <T w="extrabold" size={17}>
            Layanan TALITA-NG
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <Service href="/(tabs)/chatbot" icon={Sparkles} color={brand.chatbot} title="Chatbot AI" desc="Tanya indikator & dokumen resmi BPS" />
            <Service href="/(tabs)/zoom" icon={Video} color={brand.zoom} title="Konsultasi Zoom" desc="Jadwalkan tatap muka virtual" />
            <Service href="/(tabs)/forum" icon={Users} color={brand.orangeStrong} title="Forum Komunitas" desc="Diskusi & tanya jawab statistik" />
            <Service href="/support" icon={Headphones} color={brand.support} title="Chat Admin" desc="Bantuan langsung tim admin" />
          </View>
        </View>

        <Pressable
          accessibilityRole="link"
          accessibilityHint="Buka lokasi kantor di aplikasi peta"
          onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE.mapsQuery)}`)}
          style={{ margin: 16, padding: 16, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', gap: 12 }}
        >
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(234,88,12,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={20} color={brand.forum} />
          </View>
          <View style={{ flex: 1 }}>
            <T w="bold" size={14}>
              {OFFICE.name}
            </T>
            <T muted size={13}>
              {OFFICE.address}
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <Clock size={14} color={c.textMuted} />
              <T muted size={12}>
                {OFFICE.hours}
              </T>
            </View>
          </View>
        </Pressable>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chat Admin"
        onPress={() => router.push('/support')}
        style={({ pressed }) => ({
          position: 'absolute', right: 18, bottom: 18, height: 56, paddingHorizontal: 18, borderRadius: 28, backgroundColor: brand.support,
          flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.85 : 1,
          shadowColor: brand.support, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6,
        })}
      >
        <Headphones size={20} color="#FFFFFF" />
        <T w="bold" size={14} color="#FFFFFF">
          Chat Admin
        </T>
      </Pressable>
    </View>
  );
}

/** Counter beranimasi (PRD F-03). */
function useCountUp(target?: number) {
  const anim = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (target == null) return;
    const id = anim.addListener(({ value }) => setShown(Math.round(value)));
    Animated.timing(anim, { toValue: target, duration: 900, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [target, anim]);
  return shown;
}

function StatTile({ bg, icon: Icon, color, label, value, text, textColor }: { bg: string; icon: LucideIcon; color: string; label: string; value?: number; text?: string; textColor?: string }) {
  const { c } = useTheme();
  const n = useCountUp(value);
  return (
    <View style={{ width: '48%', flexGrow: 1, backgroundColor: bg, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: c.border }} accessible accessibilityLabel={`${label}: ${text ?? value ?? 'memuat'}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: color + '24', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </View>
        <T muted size={12}>
          {label}
        </T>
      </View>
      <T w="extrabold" size={22} color={textColor} style={{ marginTop: 8 }} numberOfLines={1}>
        {text ?? (value == null ? '–' : formatNumber(n))}
      </T>
    </View>
  );
}

function Service({ href, icon: Icon, color, title, desc }: { href: Href; icon: LucideIcon; color: string; title: string; desc: string }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${desc}`}
      onPress={() => router.push(href)}
      style={({ pressed }) => ({ width: '47%', flexGrow: 1, minHeight: 128, padding: 14, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, gap: 10, opacity: pressed ? 0.85 : 1 })}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={22} color="#FFFFFF" />
      </View>
      <T w="bold" size={15}>
        {title}
      </T>
      <T muted size={12}>
        {desc}
      </T>
    </Pressable>
  );
}
