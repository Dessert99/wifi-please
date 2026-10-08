import { router } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { colors, typography } from '@/constants/theme';
import privacy from '../../shared/privacy.json';

// 웹 공개본과 같은 내용으로 데이터 처리 방식과 문의 연락처를 보여준다.
export default function PrivacyScreen() {
  return <Screen title="개인정보처리방침" footer={null} onBack={() => router.canGoBack() ? router.back() : router.replace('/')}>
    <Text style={typography.description}>{privacy.appName} · {privacy.updatedAt}</Text>
    {privacy.sections.map(section => <View key={section.title} style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>{section.title}</Text>
      <Text style={typography.description}>{section.text}</Text>
    </View>)}
    <Text style={typography.description}>{privacy.developerName || '개발자 정보 등록 전'}{ '\n' }{privacy.contactEmail || '출시 전 문의 이메일 등록이 필요합니다.'}</Text>
    {privacy.contactEmail && <Text accessibilityRole="link" style={styles.link} onPress={() => { void Linking.openURL(`mailto:${privacy.contactEmail}`).catch(() => {}); }}>개인정보 문의하기</Text>}
    {privacy.links.map(link => <Text key={link.url} accessibilityRole="link" style={styles.link} onPress={() => { void Linking.openURL(link.url).catch(() => {}); }}>{link.title}</Text>)}
    <Text accessibilityRole="link" style={styles.link} onPress={() => router.push('/terms')}>서비스 이용약관</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  link: { color: colors.accent, fontSize: 15, paddingVertical: 12 },
});
