import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '@/constants/theme';

export type IconName = 'back' | 'copy' | 'share' | 'photo' | 'wifi' | 'alert' | 'check' | 'qr';
export function Icon({ name, size = 24, color = colors.text }: { name: IconName; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {name === 'back' && <Path d="m14 6-6 6 6 6" />}
      {name === 'copy' && <><Rect x="8" y="8" width="12" height="13" rx="3" /><Path d="M16 5V4a1 1 0 0 0-1-1H5a2 2 0 0 0-2 2v10a1 1 0 0 0 1 1h1" /></>}
      {name === 'share' && <><Path d="M12 15V3m-4 4 4-4 4 4M6 11H4v9h16v-9h-2" /></>}
      {name === 'photo' && <><Rect x="3" y="4" width="18" height="16" rx="3" /><Circle cx="8" cy="9" r="1.5" /><Path d="m4 18 5-5 3 3 4-6 5 7" /></>}
      {name === 'wifi' && <><Path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4.5 4.5 0 0 1 6 0" /><Circle cx="12" cy="20" r=".6" fill={color} /></>}
      {name === 'alert' && <><Circle cx="12" cy="12" r="9" /><Path d="M12 7v6m0 4h.01" /></>}
      {name === 'check' && <Path d="m5 12 4 4 10-10" />}
      {name === 'qr' && <><Rect x="3" y="3" width="6" height="6" rx="1" /><Rect x="15" y="3" width="6" height="6" rx="1" /><Rect x="3" y="15" width="6" height="6" rx="1" /><Path d="M15 15h3v3h3m-6 3h3m3-6v-3M3 12h9V3m0 12v6" /></>}
    </Svg>
  );
}


type IconProps = {
  size?: number;
  color: string;
};

export function FlashIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round">
      <Path d="M13 2 4 14h7l-1 8 9-12h-7z" />
    </Svg>
  );
}
