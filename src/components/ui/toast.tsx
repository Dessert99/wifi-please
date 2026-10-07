import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './icon';

// 터치를 가로채지 않고 지정된 위치에 안내 문구를 표시한다.
export function Toast({ message, bottom }: { message: string; bottom: number }) {
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.toast, { bottom }]}>
      <Icon name="check" size={18} color="white" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', alignSelf: 'center', backgroundColor: '#24272D', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { color: 'white', fontSize: 13, fontWeight: '600' },
});
