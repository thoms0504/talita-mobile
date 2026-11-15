import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { Siger, Zigzag } from './Siger';
import { IconButton, T } from './ui';

type Props = {
  title: string;
  subtitle?: string;
  back?: boolean | (() => void);
  left?: ReactNode;
  right?: ReactNode;
  /** Ganti gradien (mis. hijau untuk Chat Admin). */
  colors?: readonly [string, string, ...string[]];
  zigzagColor?: string;
  children?: ReactNode;
};

/** Header gradien oranye–merah khas TALITA-NG dengan watermark Siger dan tepi zigzag emas. */
export function AppHeader({ title, subtitle, back, left, right, colors, zigzagColor, children }: Props) {
  const insets = useSafeAreaInsets();
  const { gradient } = useTheme();
  const onBack = typeof back === 'function' ? back : () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <LinearGradient colors={colors ?? gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -24, bottom: -6 }}>
        <Siger width={150} variant="mono" color="#FFFFFF" opacity={0.13} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 }}>
        {back ? <IconButton icon={ChevronLeft} label="Kembali" onPress={onBack} color="#FFFFFF" bg="rgba(255,255,255,0.14)" /> : left}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T w="bold" size={19} color="#FFFFFF" numberOfLines={1} accessibilityRole="header">
            {title}
          </T>
          {subtitle ? (
            <T size={12} color="rgba(255,255,255,0.88)" numberOfLines={1}>
              {subtitle}
            </T>
          ) : null}
        </View>
        {right ? <View style={{ flexDirection: 'row', gap: 8 }}>{right}</View> : null}
      </View>
      {children}
      <Zigzag color={zigzagColor} />
    </LinearGradient>
  );
}
