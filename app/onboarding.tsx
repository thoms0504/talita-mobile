import { router } from 'expo-router';
import { Headphones, Sparkles, Users, Video, type LucideIcon } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { FlatList, Pressable, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Button, T } from '@/components/ui';
import { KEYS, prefs } from '@/lib/storage';
import { brand, useTheme } from '@/theme';

type Slide = { key: string; tint: string; icons: [LucideIcon, string][]; title: string; text: string };
const SLIDES: Slide[] = [
  { key: 'ai', tint: '#EDE9FE', icons: [[Sparkles, brand.chatbot]], title: 'Tanya data, dijawab AI', text: 'Asisten AI TALITA menjawab pertanyaan statistik berdasarkan dokumen resmi BPS — kapan saja, 24/7.' },
  { key: 'forum', tint: '#FFEDD5', icons: [[Users, brand.forum], [Video, brand.zoom]], title: 'Diskusi & konsultasi', text: 'Ajukan pertanyaan di Forum Komunitas, atau jadwalkan konsultasi Zoom dengan petugas BPS Lampung.' },
  { key: 'admin', tint: '#D1FAE5', icons: [[Headphones, brand.support]], title: 'Bantuan langsung admin', text: 'Butuh bantuan khusus? Chat realtime dengan tim admin BPS Lampung, lengkap dengan lampiran file.' },
];

export default function Onboarding() {
  const { width } = useWindowDimensions();
  const { c } = useTheme();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const finish = async () => {
    await prefs.set(KEYS.onboarded, true); // hanya tampil sekali
    router.replace('/(auth)/login');
  };
  const next = () => (index < SLIDES.length - 1 ? listRef.current?.scrollToIndex({ index: index + 1 }) : finish());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image source={require('../assets/images/talita-logo.png')} style={{ width: 40, height: 40, borderRadius: 20 }} />
          <View>
            <T w="extrabold" size={15}>
              TALITA-NG
            </T>
            <T w="semibold" size={11} color={c.primary} style={{ letterSpacing: 1.5 }}>
              BPS LAMPUNG
            </T>
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={finish} hitSlop={10} style={{ padding: 12 }}>
          <T w="semibold" muted>
            Lewati
          </T>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
            <View style={{ width: 260, height: 260, borderRadius: 130, backgroundColor: item.tint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
              {item.icons.map(([Icon, color], i) => {
                const s = item.icons.length > 1 ? 92 : 116;
                return (
                  <View key={i} style={{ width: s, height: s, borderRadius: s * 0.3, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={s * 0.45} color="#FFFFFF" />
                  </View>
                );
              })}
            </View>
            <T w="extrabold" size={26} style={{ marginTop: 40, textAlign: 'center', lineHeight: 33 }}>
              {item.title}
            </T>
            <T muted size={15} style={{ marginTop: 12, textAlign: 'center', maxWidth: 320 }}>
              {item.text}
            </T>
          </View>
        )}
      />

      <View style={{ paddingHorizontal: 24, paddingBottom: 24, gap: 24 }}>
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }} accessibilityLabel={`Slide ${index + 1} dari ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={{ height: 8, width: i === index ? 24 : 8, borderRadius: 4, backgroundColor: i === index ? c.primary : '#E7D5C7' }} />
          ))}
        </View>
        <Button title={index === SLIDES.length - 1 ? 'Mulai' : 'Lanjut'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}
