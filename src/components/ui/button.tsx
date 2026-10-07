import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/theme';
import { Icon, type IconName } from './icon';

// 버튼 종류와 입력 상태에 맞는 표시·접근성을 적용하고 클릭을 전달한다.
export function Button({ title, onPress, secondary, quiet, disabled, icon }: {
  title: string; onPress: () => void; secondary?: boolean; quiet?: boolean; disabled?: boolean; icon?: IconName;
}) {
  const color = secondary || quiet ? colors.accent : colors.onAccent;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, quiet && styles.quiet, (pressed || disabled) && { opacity: disabled ? .4 : .7 }]}>
    {icon && <Icon name={icon} color={color} size={20} />}<Text style={[styles.buttonText, { color }]}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  quiet: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 16, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
});
