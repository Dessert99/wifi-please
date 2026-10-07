import { ShareFeedback } from '@/features/wifi/components/share-feedback';
import { Redirect, router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { WifiQr } from '@/features/wifi/components/wifi-qr';
import { colors, typography } from '@/constants/theme';
import { useWifiSession } from '@/features/wifi/session';
import { useShareActions } from '@/features/wifi/use-share-actions';

// 최근 와이파이의 QR·비밀번호와 공유·재연결 동작을 한 화면에 배치한다.
export default function ShareScreen() {
  const { wifi } = useWifiSession();
  const actions = useShareActions(wifi);
  // 메모리 세션이 비어 있으면 촬영 화면부터 시작한다.
  if (!wifi) return <Redirect href="/" />;
  const secured = wifi.password !== '';
  // 이전 화면이 있으면 돌아가고, 직접 진입했다면 촬영 화면으로 이동한다.
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return <>
    <Screen onBack={goBack} title="와이파이 공유" footer={<>
      <Button title="공유하기" onPress={actions.share} disabled={actions.busy} icon="share" />
      {secured && <Button title="비밀번호 크게 보기" quiet onPress={() => router.push('/password')} />}
    </>}>
      <View style={{ gap: 6 }}><Text accessibilityRole="header" style={typography.title}>친구들과 함께 연결해요</Text><Text style={typography.description}>QR을 보여주거나 정보를 보내주세요</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="QR 크게 보기" onPress={() => router.push('/qr')} style={[styles.card, { alignItems: 'center', padding: 12 }]}>
        <WifiQr wifi={wifi} /><Text style={styles.qrLabel}>QR 크게 보기</Text>
      </Pressable>
      <View style={styles.card}>
        <Text style={typography.label}>와이파이 이름</Text><Text selectable style={styles.ssid}>{wifi.ssid}</Text>
        <View style={styles.divider} />
        {secured ? <>
          <Text style={typography.label}>비밀번호</Text>
          <View style={styles.passwordRow}><Text selectable style={styles.password}>{wifi.password}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="비밀번호 복사" onPress={actions.copy} style={styles.iconButton}><Icon name="copy" color={colors.accent} size={21} /></Pressable>
          </View>
        </> : <Text style={styles.open}>비밀번호 없이 연결해요</Text>}
      </View>
      <Pressable accessibilityRole="button" disabled={actions.busy} onPress={actions.connect} style={styles.reconnect}><Text style={styles.reconnectText}>시스템 와이파이 창 다시 열기 ›</Text></Pressable>
    </Screen>
    <ShareFeedback dialog={actions.dialog} copied={actions.copied} onClose={actions.closeDialog} />
  </>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 22, backgroundColor: colors.surface },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },

  qrLabel: { color: colors.accent, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  ssid: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: colors.text },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 18 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4, marginRight: -10 },
  password: { flex: 1, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 16, lineHeight: 25, color: colors.text },
  open: { fontSize: 16, fontWeight: '600', color: colors.text },
  reconnect: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  reconnectText: { fontSize: 13, color: colors.textSub, textAlign: 'center' },
});
