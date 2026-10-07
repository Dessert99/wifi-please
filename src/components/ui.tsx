import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export function BrandMark() {
  return <View style={ui.brandMark}>
    <Svg width={72} height={72} viewBox="0 0 72 72" style={{ position: 'absolute', left: 16, top: 16 }}>
      <Path d="M8 25V16a8 8 0 0 1 8-8h9m22 0h9a8 8 0 0 1 8 8v9M8 47v9a8 8 0 0 0 8 8h9m22 0h9a8 8 0 0 0 8-8v-9" stroke="white" strokeWidth={3} fill="none" strokeLinecap="round" />
    </Svg>
    <Icon name="wifi" color="white" size={42} />
  </View>;
}

export function Button({ title, onPress, secondary, quiet, disabled, icon }: {
  title: string; onPress: () => void; secondary?: boolean; quiet?: boolean; disabled?: boolean; icon?: IconName;
}) {
  const color = secondary || quiet ? colors.accent : colors.onAccent;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.button, secondary && ui.secondary, quiet && ui.quiet, (pressed || disabled) && { opacity: disabled ? .4 : .7 }]}>
    {icon && <Icon name={icon} color={color} size={20} />}<Text style={[ui.buttonText, { color }]}>{title}</Text>
  </Pressable>;
}

export function Screen({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[ui.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
    <StatusBar style="dark" />
    <View style={ui.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={() => router.canGoBack() ? router.back() : router.replace('/') } style={ui.iconButton}><Icon name="back" /></Pressable>
      <Text style={ui.headerTitle}>{title}</Text><View style={{ width: 48 }} />
    </View>
    <ScrollView contentContainerStyle={ui.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>
    <View style={ui.footer}>{footer}</View>
  </View>;
}

export type DialogState = {
  title: string; message: string; primary: string; onPrimary: () => void;
  secondary?: string; onSecondary?: () => void;
};
export function Dialog({ value, onClose }: { value: DialogState | null; onClose: () => void }) {
  if (!value) return null;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={ui.scrim}>
      <View style={ui.dialog} accessibilityViewIsModal>
        <View style={ui.alertIcon}><Icon name="alert" color={colors.accent} size={28} /></View>
        <Text accessibilityRole="header" style={ui.dialogTitle}>{value?.title}</Text>
        <Text style={[ui.description, { textAlign: 'center', marginBottom: 24 }]}>{value?.message}</Text>
        <Button title={value?.primary ?? '닫기'} onPress={value?.onPrimary ?? onClose} />
        {value?.secondary && <Button title={value.secondary} onPress={value.onSecondary ?? onClose} quiet />}
      </View>
    </View>
  </Modal>;
}

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, paddingTop: 22, gap: 18, flexGrow: 1 },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 8 },
  button: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  quiet: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  title: { fontSize: 25, lineHeight: 34, fontWeight: '800', letterSpacing: -.8, color: colors.text },
  description: { fontSize: 14, lineHeight: 23, color: colors.textSub },
  card: { borderRadius: 24, padding: 22, backgroundColor: colors.surface },
  label: { fontSize: 12, color: colors.textSub, marginBottom: 8 },
  brandMark: { width: 104, height: 104, backgroundColor: colors.accent, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 360, padding: 24, borderRadius: 28, backgroundColor: colors.surface },
  alertIcon: { width: 56, height: 56, backgroundColor: colors.accentTint, borderRadius: 18, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  dialogTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 12 },
});
