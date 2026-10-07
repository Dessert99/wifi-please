import type { TextStyle } from 'react-native';

export const colors = {
  accent: '#1A73E8',
  accentTint: 'rgba(26, 115, 232, 0.14)',
  background: '#F5F6F8',
  surface: '#FFFFFF',
  text: '#15171C',
  textSub: '#6B7280',
  line: '#E4E7EB',
  field: '#F2F4F7',
  camera: '#0B0B0C',
  onAccent: '#FFFFFF',
};

export const typography = {
  title: { fontSize: 25, lineHeight: 34, fontWeight: '800', letterSpacing: -.8, color: colors.text },
  description: { fontSize: 14, lineHeight: 23, color: colors.textSub },
  label: { fontSize: 12, color: colors.textSub, marginBottom: 8 },
} satisfies Record<string, TextStyle>;
