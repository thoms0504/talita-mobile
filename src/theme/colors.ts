/**
 * Token warna TALITA-NG, mengikuti identitas visual web (lihat PRD §6.1).
 * Warna teks/tombol memakai shade yang lebih gelap agar kontras ≥ 4.5:1 di layar HP;
 * warna PRD asli tetap dipakai sebagai aksen dekoratif.
 */
export const brand = {
  orange: '#E05D15', // aksen PRD
  orangeStrong: '#C2410C', // tombol & teks utama
  red: '#DC2626',
  redDeep: '#7F1D1D',
  amber: '#F59E0B',
  gold: '#FBBF24',
  chatbot: '#7C3AED',
  zoom: '#2563EB',
  forum: '#EA580C',
  support: '#047857', // #059669 di PRD, digelapkan untuk kontras teks putih
};

export const headerGradient = {
  light: ['#C2410C', '#B91C1C', '#7F1D1D'] as const,
  dark: ['#7C2D12', '#7F1D1D', '#450A0A'] as const,
};

export type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primarySoft: string;
  primaryText: string;
  danger: string;
  dangerSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  inputBg: string;
  inputBorder: string;
  chatbotSoft: string;
  zoomSoft: string;
  supportSoft: string;
  overlay: string;
};

export const light: Palette = {
  bg: '#FFF8F1',
  surface: '#FFFFFF',
  surfaceAlt: '#FAF6F2',
  border: '#F0E6DC',
  text: '#1C1917',
  textMuted: '#57534E',
  textSubtle: '#78716C',
  primary: brand.orangeStrong,
  primarySoft: '#FFEDD5',
  primaryText: '#9A3412',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  success: '#047857',
  successSoft: '#D1FAE5',
  warning: '#92400E',
  warningSoft: '#FEF3C7',
  inputBg: '#FFFFFF',
  inputBorder: '#E2D6CC',
  chatbotSoft: '#F5F3FF',
  zoomSoft: '#EFF6FF',
  supportSoft: '#ECFDF5',
  overlay: 'rgba(28,25,23,0.45)',
};

export const dark: Palette = {
  bg: '#1C1917',
  surface: '#292524',
  surfaceAlt: '#211D1B',
  border: '#3A3431',
  text: '#FAFAF9',
  textMuted: '#A8A29E',
  textSubtle: '#A8A29E',
  primary: '#FB923C',
  primarySoft: 'rgba(251,146,60,0.16)',
  primaryText: '#FDBA74',
  danger: '#F87171',
  dangerSoft: 'rgba(248,113,113,0.12)',
  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.14)',
  warning: '#FCD34D',
  warningSoft: 'rgba(252,211,77,0.14)',
  inputBg: '#211D1B',
  inputBorder: '#44403C',
  chatbotSoft: 'rgba(124,58,237,0.16)',
  zoomSoft: 'rgba(37,99,235,0.16)',
  supportSoft: 'rgba(4,120,87,0.18)',
  overlay: 'rgba(0,0,0,0.6)',
};

export const radius = { md: 12, xl: 12, '2xl': 16, '3xl': 24 };

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};
