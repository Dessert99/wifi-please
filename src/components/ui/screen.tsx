import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { Icon } from './icon';

type ScreenProps = {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onBack: () => void;
};

export function Screen({ title, children, footer, onBack }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
    <StatusBar style="dark" />
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack} style={styles.iconButton}><Icon name="back" /></Pressable>
      <Text style={styles.headerTitle}>{title}</Text><View style={{ width: 48 }} />
    </View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>{children}</ScrollView>
    <View style={styles.footer}>{footer}</View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 24, paddingTop: 22, gap: 18, flexGrow: 1 },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 8 },
});
