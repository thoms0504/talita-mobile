import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { brand } from '@/theme';

/**
 * Siger Pepadun — mahkota adat Lampung dengan sembilan lekuk (*sigekh lekuk siwo*).
 * Digambar ulang sebagai vektor orisinal untuk TALITA-NG (bukan salinan logo/ornamen pihak lain).
 * variant "gold": ornamen emas penuh · "mono": satu warna (watermark di header).
 */
const BODY = 'M7.5 67.2 C4.5 53.2 1.0 59.1 10.0 43.1 C19.0 59.1 35.5 54.6 32.5 68.6 C29.5 54.6 28.5 57.6 37.5 41.6 C46.5 57.6 60.5 60.2 57.5 74.2 C54.5 60.2 56.0 54.3 65.0 38.3 C74.0 54.3 85.5 63.9 82.5 77.9 C79.5 63.9 83.5 51.1 92.5 35.1 C101.5 51.1 110.5 65.8 107.5 79.8 C104.5 65.8 111.0 46.0 120.0 30.0 C129.0 46.0 135.5 65.8 132.5 79.8 C129.5 65.8 138.5 51.1 147.5 35.1 C156.5 51.1 160.5 63.9 157.5 77.9 C154.5 63.9 166.0 54.3 175.0 38.3 C184.0 54.3 185.5 60.2 182.5 74.2 C179.5 60.2 193.5 57.6 202.5 41.6 C211.5 57.6 210.5 54.6 207.5 68.6 C204.5 54.6 221.0 59.1 230.0 43.1 C239.0 59.1 235.5 53.2 232.5 67.2 L236.5 83.2 Q120.0 128.0 3.5 83.2 L7.5 67.2 Z';
const BAND = 'M9.5 73.2 Q120.0 118.0 230.5 73.2';
const INNER = 'M10.0 67.1 C3.0 63.1 6.0 61.8 10.0 53.8 C14.0 61.8 17.0 63.1 10.0 67.1 Z M37.5 73.6 C30.5 69.6 33.5 63.3 37.5 55.3 C41.5 63.3 44.5 69.6 37.5 73.6 Z M65.0 78.3 C58.0 74.3 61.0 63.0 65.0 55.0 C69.0 63.0 72.0 74.3 65.0 78.3 Z M92.5 81.1 C85.5 77.1 88.5 62.1 92.5 54.1 C96.5 62.1 99.5 77.1 92.5 81.1 Z M120.0 82.0 C113.0 78.0 116.0 59.3 120.0 51.3 C124.0 59.3 127.0 78.0 120.0 82.0 Z M147.5 81.1 C140.5 77.1 143.5 62.1 147.5 54.1 C151.5 62.1 154.5 77.1 147.5 81.1 Z M175.0 78.3 C168.0 74.3 171.0 63.0 175.0 55.0 C179.0 63.0 182.0 74.3 175.0 78.3 Z M202.5 73.6 C195.5 69.6 198.5 63.3 202.5 55.3 C206.5 63.3 209.5 69.6 202.5 73.6 Z M230.0 67.1 C223.0 63.1 226.0 61.8 230.0 53.8 C234.0 61.8 237.0 63.1 230.0 67.1 Z';
const DOTS: [number, number][] = [[10.0, 80.1], [37.5, 86.6], [65.0, 91.3], [92.5, 94.1], [120.0, 95.0], [147.5, 94.1], [175.0, 91.3], [202.5, 86.6], [230.0, 80.1]];
const TIPS: [number, number][] = [[10.0, 42.1], [37.5, 40.6], [65.0, 37.3], [92.5, 34.1], [120.0, 29.0], [147.5, 34.1], [175.0, 37.3], [202.5, 40.6], [230.0, 42.1]];

type Props = { width?: number; variant?: 'gold' | 'mono'; color?: string; opacity?: number };

export function Siger({ width = 120, variant = 'gold', color = '#FFFFFF', opacity = 1 }: Props) {
  const height = width / 2;
  if (variant === 'mono') {
    return (
      <Svg width={width} height={height} viewBox="0 0 240 120" opacity={opacity} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path d={BODY} fill={color} />
        {TIPS.map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={3.2} fill={color} />
        ))}
      </Svg>
    );
  }
  return (
    <Svg width={width} height={height} viewBox="0 0 240 120" opacity={opacity} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={BODY} fill={brand.amber} stroke="#B45309" strokeWidth={2} strokeLinejoin="round" />
      <Path d={INNER} fill="#FEF3C7" opacity={0.55} />
      <Path d={BAND} fill="none" stroke="#B45309" strokeWidth={2.4} strokeLinecap="round" />
      {DOTS.map(([x, y], i) => (
        <Circle key={`d${i}`} cx={x} cy={y} r={2.6} fill="#FEF3C7" />
      ))}
      {TIPS.map(([x, y], i) => (
        <Circle key={`t${i}`} cx={x} cy={y} r={3.2} fill={brand.amber} />
      ))}
    </Svg>
  );
}

/** Garis zigzag emas di bawah header (meniru tepi header web). */
export function Zigzag({ color = brand.gold, height = 7 }: { color?: string; height?: number }) {
  const pts = Array.from({ length: 61 }, (_, i) => `${i * 8},${i % 2 === 0 ? 0.8 : 6.2}`).join(' ');
  return (
    <Svg width="100%" height={height} viewBox="0 0 480 7" preserveAspectRatio="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}
