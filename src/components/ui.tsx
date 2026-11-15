import { Image } from 'expo-image';
import { Eye, EyeOff, WifiOff, type LucideIcon } from 'lucide-react-native';
import { forwardRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text as RNText, TextInput, View,
  type PressableProps, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { absoluteUrl } from '@/api';
import { initials } from '@/lib/format';
import { font, useTheme } from '@/theme';

// ───────────── Text ─────────────
type Weight = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';
export function T({ w = 'regular', size = 14, color, muted, style, ...p }: TextProps & { w?: Weight; size?: number; color?: string; muted?: boolean }) {
  const { c } = useTheme();
  return (
    <RNText
      {...p}
      maxFontSizeMultiplier={1.4}
      style={[{ fontFamily: font[w], fontSize: size, color: color ?? (muted ? c.textMuted : c.text), lineHeight: Math.round(size * 1.45) }, style]}
    />
  );
}

// ───────────── Button ─────────────
type BtnProps = Omit<PressableProps, 'style'> & {
  title: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'outline' | 'danger' | 'ghost';
  color?: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: 'md' | 'sm';
};
export function Button({ title, icon: Icon, variant = 'primary', color, loading, disabled, style, size = 'md', ...p }: BtnProps) {
  const { c } = useTheme();
  const bg = variant === 'primary' ? color ?? c.primary : variant === 'danger' ? c.dangerSoft : variant === 'outline' ? c.surface : 'transparent';
  const fg = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? c.danger : variant === 'ghost' ? color ?? c.primary : c.text;
  const border = variant === 'outline' ? c.inputBorder : variant === 'danger' ? c.danger + '55' : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      disabled={disabled || loading}
      {...p}
      style={({ pressed }) => [
        styles.btn,
        { height: size === 'md' ? 50 : 42, backgroundColor: bg, borderColor: border, opacity: disabled ? 0.55 : pressed ? 0.85 : 1 },
        variant === 'primary' && styles.btnShadow,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : Icon ? <Icon size={19} color={fg} /> : null}
      <T w="bold" size={size === 'md' ? 15 : 14} color={fg}>
        {title}
      </T>
    </Pressable>
  );
}

// ───────────── Icon button (≥44 px) ─────────────
export function IconButton({ icon: Icon, label, onPress, color, bg, size = 44, disabled }: { icon: LucideIcon; label: string; onPress?: () => void; color?: string; bg?: string; size?: number; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: bg ?? 'transparent', opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}
    >
      <Icon size={21} color={color ?? c.text} />
    </Pressable>
  );
}

// ───────────── TextField ─────────────
type FieldProps = TextInputProps & { label: string; error?: string; hint?: string; icon?: LucideIcon; secureToggle?: boolean; right?: ReactNode };
export const TextField = forwardRef<TextInput, FieldProps>(function TextField({ label, error, hint, icon: Icon, secureToggle, right, style, multiline, editable = true, ...p }, ref) {
  const { c } = useTheme();
  const [hidden, setHidden] = useState(!!secureToggle);
  const [focus, setFocus] = useState(false);
  return (
    <View>
      <T w="semibold" size={13} style={{ marginBottom: 6 }}>
        {label}
      </T>
      <View
        style={[
          styles.input,
          {
            backgroundColor: editable ? c.inputBg : c.surfaceAlt,
            borderColor: error ? c.danger : focus ? c.primary : c.inputBorder,
            minHeight: multiline ? 96 : 50,
            alignItems: multiline ? 'flex-start' : 'center',
          },
        ]}
      >
        {Icon ? <Icon size={18} color={c.textSubtle} style={{ marginLeft: 14, marginTop: multiline ? 14 : 0 }} /> : null}
        <TextInput
          {...p}
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={c.textSubtle}
          secureTextEntry={hidden}
          multiline={multiline}
          editable={editable}
          onFocus={(e) => {
            setFocus(true);
            p.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            p.onBlur?.(e);
          }}
          style={[
            { flex: 1, fontFamily: font.regular, fontSize: 15, color: c.text, paddingHorizontal: 14, paddingVertical: multiline ? 12 : 0, textAlignVertical: multiline ? 'top' : 'center', minHeight: multiline ? 96 : 48 },
            style as StyleProp<TextStyle>,
          ]}
        />
        {secureToggle ? <IconButton icon={hidden ? Eye : EyeOff} label={hidden ? 'Tampilkan password' : 'Sembunyikan password'} onPress={() => setHidden((h) => !h)} color={c.textSubtle} /> : null}
        {right}
      </View>
      {error ? (
        <T size={12} color={c.danger} style={{ marginTop: 6 }} accessibilityLiveRegion="polite">
          {error}
        </T>
      ) : hint ? (
        <T size={12} muted style={{ marginTop: 6 }}>
          {hint}
        </T>
      ) : null}
    </View>
  );
});

// ───────────── Chip ─────────────
export function Chip({ label, selected, onPress, color, small }: { label: string; selected?: boolean; onPress?: () => void; color?: string; small?: boolean }) {
  const { c } = useTheme();
  const accent = color ?? c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        height: small ? 34 : 40,
        paddingHorizontal: 14,
        borderRadius: 999,
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: selected ? accent : c.inputBorder,
        backgroundColor: selected ? accent : c.surface,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <T w={selected ? 'bold' : 'semibold'} size={13} color={selected ? '#FFFFFF' : c.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function TagPill({ name }: { name: string }) {
  const { c } = useTheme();
  return (
    <View style={{ backgroundColor: c.primarySoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
      <T w="semibold" size={12} color={c.primaryText}>
        {name}
      </T>
    </View>
  );
}

// ───────────── Segmented ─────────────
export function Segmented<K extends string>({ value, options, onChange, accent }: { value: K; options: { key: K; label: string }[]; onChange: (k: K) => void; accent?: string }) {
  const { c, isDark } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, borderRadius: 14, backgroundColor: isDark ? c.surfaceAlt : '#F3E8DE', gap: 4 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surface : 'transparent', ...(on ? styles.segShadow : null) }}
          >
            <T w={on ? 'bold' : 'semibold'} size={14} color={on ? accent ?? c.primaryText : c.textMuted}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

// ───────────── Card ─────────────
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <View style={[{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 20, padding: 16 }, style]}>{children}</View>;
}

// ───────────── Avatar ─────────────
export function Avatar({ name, url, size = 40, radius }: { name?: string | null; url?: string | null; size?: number; radius?: number }) {
  const r = radius ?? size * 0.32;
  const src = absoluteUrl(url);
  if (src) return <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" accessibilityLabel={`Foto ${name ?? 'pengguna'}`} />;
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' }}>
      <T w="extrabold" size={size * 0.36} color="#7C2D12">
        {initials(name)}
      </T>
    </View>
  );
}

// ───────────── Status ─────────────
export function Badge({ label, fg, bg, icon: Icon }: { label: string; fg: string; bg: string; icon?: LucideIcon }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      {Icon ? <Icon size={13} color={fg} strokeWidth={2.5} /> : null}
      <T w="bold" size={12} color={fg}>
        {label}
      </T>
    </View>
  );
}

export function OfflineBanner({ visible }: { visible: boolean }) {
  const { c } = useTheme();
  if (!visible) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: c.warningSoft, paddingHorizontal: 16, paddingVertical: 8 }}>
      <WifiOff size={16} color={c.warning} />
      <T w="semibold" size={13} color={c.warning}>
        Tidak ada koneksi — menampilkan data tersimpan
      </T>
    </View>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 8 }}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={28} color={c.primary} />
      </View>
      <T w="bold" size={16} style={{ textAlign: 'center', marginTop: 4 }}>
        {title}
      </T>
      {text ? (
        <T muted size={14} style={{ textAlign: 'center' }}>
          {text}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export function Loading() {
  const { c } = useTheme();
  return (
    <View style={{ paddingVertical: 32, alignItems: 'center' }}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 18 },
  btnShadow: { shadowColor: '#C2410C', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  input: { flexDirection: 'row', borderRadius: 12, borderWidth: 1.5 },
  segShadow: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
