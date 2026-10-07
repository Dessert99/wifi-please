import { Redirect } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { Button, Screen, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useWifiSession } from '@/features/wifi/session';
import { useShareActions } from '@/features/wifi/share-actions';

export default function PasswordScreen() {
  const { wifi } = useWifiSession();
  const actions = useShareActions(wifi);
  if (!wifi) return <Redirect href="/" />;
  if (!wifi.password) return <Redirect href="/share" />;
  return <>
    <Screen title="비밀번호 크게 보기" footer={<>
      <Button title="비밀번호 복사" icon="copy" onPress={actions.copy} />
      <Button title="공유하기" secondary icon="share" disabled={actions.busy} onPress={actions.share} />
    </>}>
      <View style={{ marginTop: 28, gap: 8 }}><Text style={ui.label}>와이파이 이름</Text><Text selectable style={[ui.title, { fontSize: 22 }]}>{wifi.ssid}</Text></View>
      <View style={[ui.card, { padding: 24, marginTop: 8, minHeight: 180, justifyContent: 'center' }]}>
        <Text style={ui.label}>비밀번호</Text>
        <Text selectable style={{ fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: wifi.password.length > 18 ? 28 : 37, lineHeight: wifi.password.length > 18 ? 42 : 52, color: colors.text, fontWeight: '600' }}>{wifi.password}</Text>
      </View>
      <Text style={ui.description}>노트북에서 위 이름을 선택하고{ '\n' }비밀번호를 입력해 주세요</Text>
    </Screen>
    {actions.feedback}
  </>;
}
