import { useColorScheme } from 'react-native';
import { useSettings } from '@/store/settings';
import { brand, dark, font, headerGradient, light, radius, type Palette } from './colors';

export { brand, font, radius };
export type { Palette };

export function useTheme() {
  const mode = useSettings((s) => s.themeMode);
  const system = useColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return {
    isDark,
    c: isDark ? dark : light,
    gradient: isDark ? headerGradient.dark : headerGradient.light,
  };
}
