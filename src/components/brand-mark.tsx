import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/theme';
import { Icon } from './ui/icon';

export function BrandMark() {
  return <View style={styles.brandMark}>
    <Svg width={72} height={72} viewBox="0 0 72 72" style={{ position: 'absolute', left: 16, top: 16 }}>
      <Path d="M8 25V16a8 8 0 0 1 8-8h9m22 0h9a8 8 0 0 1 8 8v9M8 47v9a8 8 0 0 0 8 8h9m22 0h9a8 8 0 0 0 8-8v-9" stroke="white" strokeWidth={3} fill="none" strokeLinecap="round" />
    </Svg>
    <Icon name="wifi" color="white" size={42} />
  </View>;
}

const styles = StyleSheet.create({
  brandMark: { width: 104, height: 104, backgroundColor: colors.accent, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
