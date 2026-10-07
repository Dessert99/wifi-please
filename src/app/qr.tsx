import { ShareFeedback } from '@/features/wifi/components/share-feedback';
import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { WifiQr } from '@/features/wifi/components/wifi-qr';
import { colors, typography } from '@/constants/theme';
import { useWifiSession } from '@/features/wifi/session';
import { useShareActions } from '@/features/wifi/use-share-actions';

// 다른 휴대폰이 읽을 수 있도록 와이파이 QR을 확대해 표시한다.
export default function QrScreen() {
  const { wifi } = useWifiSession();
  const actions = useShareActions(wifi);
  // 메모리 세션이 비어 있으면 촬영 화면부터 시작한다.
  if (!wifi) return <Redirect href="/" />;
  // 이전 화면이 있으면 돌아가고, 직접 진입했다면 촬영 화면으로 이동한다.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return <>
    <Screen onBack={goBack} title="QR로 연결" footer={<Button title="와이파이 정보 공유" secondary icon="share" disabled={actions.busy} onPress={actions.share} />}>
      <View style={{ alignItems: 'center', gap: 12, marginTop: 20 }}>
        <Icon name="qr" size={30} color={colors.accent} />
        <Text accessibilityRole="header" style={typography.title}>카메라로 비춰주세요</Text>
        <Text style={[typography.description, { textAlign: 'center' }]}>친구의 휴대폰에서 연결을 확인하면 돼요</Text>
      </View>
      <View style={[styles.card, { paddingHorizontal: 0, marginTop: 18 }]}><WifiQr wifi={wifi} large /></View>
      <Text selectable style={{ fontSize: 19, lineHeight: 28, fontWeight: '700', textAlign: 'center', color: colors.text }}>{wifi.ssid}</Text>
      <Text style={[typography.description, { textAlign: 'center', fontSize: 13 }]}>친구는 WiFi Please 설치 없이 연결할 수 있어요</Text>
    </Screen>
    <ShareFeedback dialog={actions.dialog} copied={actions.copied} onClose={actions.closeDialog} />
  </>;
}


const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 22, backgroundColor: colors.surface },
});
