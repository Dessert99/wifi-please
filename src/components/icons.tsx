import Svg, { Path } from 'react-native-svg';

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
