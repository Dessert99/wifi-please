import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

export function ShutterButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="촬영"
      style={({ pressed }) => [styles.ring, pressed && styles.pressed]}>
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
});
