import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

export function ShutterButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="촬영"
      style={({ pressed }) => [styles.ring, pressed && styles.pressed, disabled && styles.disabled]}>
      <View style={styles.inner} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
