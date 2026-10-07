import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, Icon, Screen, ui } from '@/components/ui';
import { WifiQr } from '@/components/wifi-qr';
import { colors } from '@/constants/theme';
import { useWifiSession } from '@/features/wifi/session';
import { useShareActions } from '@/features/wifi/share-actions';

export default function QrScreen() {
  const { wifi } = useWifiSession();
  const actions = useShareActions(wifi);
  if (!wifi) return <Redirect href="/" />;
  return <>
    <Screen title="QR로 연결" footer={<Button title="와이파이 정보 공유" secondary icon="share" disabled={actions.busy} onPress={actions.share} />}>
      <View style={{ alignItems: 'center', gap: 12, marginTop: 20 }}>
        <Icon name="qr" size={30} color={colors.accent} />
        <Text accessibilityRole="header" style={ui.title}>카메라로 비춰주세요</Text>
        <Text style={[ui.description, { textAlign: 'center' }]}>친구의 휴대폰에서 연결을 확인하면 돼요</Text>
      </View>
      <View style={[ui.card, { paddingHorizontal: 0, marginTop: 18 }]}><WifiQr wifi={wifi} large /></View>
      <Text selectable style={{ fontSize: 19, lineHeight: 28, fontWeight: '700', textAlign: 'center', color: colors.text }}>{wifi.ssid}</Text>
      <Text style={[ui.description, { textAlign: 'center', fontSize: 13 }]}>친구는 Snapfi 설치 없이 연결할 수 있어요</Text>
    </Screen>
    {actions.feedback}
  </>;
}
