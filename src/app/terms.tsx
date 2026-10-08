import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { colors, typography } from '@/constants/theme';
import terms from '../../shared/terms.json';

// 네트워크 이용 범위와 인식·연결의 한계를 공개 약관과 동일하게 안내한다.
export default function TermsScreen() {
  return <Screen title={terms.title} footer={null} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}>
    <Text style={typography.description}>WiFi Please · {terms.updatedAt}</Text>
    {terms.sections.map(section => <View key={section.title} style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{section.title}</Text>
      <Text style={typography.description}>{section.text}</Text>
    </View>)}
  </Screen>;
}
