import { ShareFeedback } from '@/features/wifi/components/share-feedback';
import { Redirect, router } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { colors, typography } from '@/constants/theme';
import { useWifiSession } from '@/features/wifi/session';
import { useShareActions } from '@/features/wifi/use-share-actions';

export default function PasswordScreen() {
  const { wifi } = useWifiSession();
  const actions = useShareActions(wifi);
  if (!wifi) return <Redirect href="/" />;
  if (!wifi.password) return <Redirect href="/share" />;
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return <>
    <Screen onBack={goBack} title="비밀번호 크게 보기" footer={<>
      <Button title="비밀번호 복사" icon="copy" onPress={actions.copy} />
      <Button title="공유하기" secondary icon="share" disabled={actions.busy} onPress={actions.share} />
    </>}>
      <View style={{ marginTop: 28, gap: 8 }}><Text style={typography.label}>와이파이 이름</Text><Text selectable style={[typography.title, { fontSize: 22 }]}>{wifi.ssid}</Text></View>
      <View style={[styles.card, { padding: 24, marginTop: 8, minHeight: 180, justifyContent: 'center' }]}>
        <Text style={typography.label}>비밀번호</Text>
        <Text selectable style={{ fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: wifi.password.length > 18 ? 28 : 37, lineHeight: wifi.password.length > 18 ? 42 : 52, color: colors.text, fontWeight: '600' }}>{wifi.password}</Text>
      </View>
      <Text style={typography.description}>노트북에서 위 이름을 선택하고{ '\n' }비밀번호를 입력해 주세요</Text>
    </Screen>
    <ShareFeedback dialog={actions.dialog} copied={actions.copied} onClose={actions.closeDialog} />
  </>;
}


const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 22, backgroundColor: colors.surface },
});
