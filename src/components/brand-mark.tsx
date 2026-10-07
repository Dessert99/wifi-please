import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

// 출시 아이콘과 같은 이미지를 사용해 앱 안에서도 동일한 브랜드 마크를 표시한다.
export function BrandMark() {
  return <Image source={require('@/assets/images/icon.png')} style={styles.brandMark} contentFit="contain" accessibilityLabel="WiFi Please" />;
}

const styles = StyleSheet.create({
  brandMark: { width: 104, height: 104, borderRadius: 25, overflow: 'hidden' },
});
