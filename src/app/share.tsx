import { Redirect, router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Icon, Screen, ui } from '@/components/ui';
import { WifiQr } from '@/features/wifi/components/wifi-qr';
import { colors } from '@/constants/theme';
import { useWifiSession } from '@/features/wifi/session';
import { useShareActions } from '@/features/wifi/share-actions';

export default function ShareScreen() {
  const { wifi } = useWifiSession();
  const actions = useShareActions(wifi);
  if (!wifi) return <Redirect href="/" />;
  const secured = wifi.password !== '';
  return <>
    <Screen title="와이파이 공유" footer={<>
      <Button title="공유하기" onPress={actions.share} disabled={actions.busy} icon="share" />
      {secured && <Button title="비밀번호 크게 보기" quiet onPress={() => router.push('/password')} />}
    </>}>
      <View style={{ gap: 6 }}><Text accessibilityRole="header" style={ui.title}>친구들과 함께 연결해요</Text><Text style={ui.description}>QR을 보여주거나 정보를 보내주세요</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="QR 크게 보기" onPress={() => router.push('/qr')} style={[ui.card, { alignItems: 'center', padding: 12 }]}>
        <WifiQr wifi={wifi} /><Text style={styles.qrLabel}>QR 크게 보기</Text>
      </Pressable>
      <View style={ui.card}>
        <Text style={ui.label}>와이파이 이름</Text><Text selectable style={styles.ssid}>{wifi.ssid}</Text>
        <View style={styles.divider} />
        {secured ? <>
          <Text style={ui.label}>비밀번호</Text>
          <View style={styles.passwordRow}><Text selectable style={styles.password}>{wifi.password}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="비밀번호 복사" onPress={actions.copy} style={ui.iconButton}><Icon name="copy" color={colors.accent} size={21} /></Pressable>
          </View>
        </> : <Text style={styles.open}>비밀번호 없이 연결해요</Text>}
      </View>
      <Pressable accessibilityRole="button" disabled={actions.busy} onPress={actions.connect} style={styles.reconnect}><Text style={styles.reconnectText}>시스템 와이파이 창 다시 열기 ›</Text></Pressable>
    </Screen>
    {actions.feedback}
  </>;
}
const styles = StyleSheet.create({
  qrLabel: { color: colors.accent, fontSize: 13, fontWeight: '600', marginBottom: 10 },
  ssid: { fontSize: 18, lineHeight: 26, fontWeight: '700', color: colors.text },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 18 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -4, marginRight: -10 },
  password: { flex: 1, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }), fontSize: 16, lineHeight: 25, color: colors.text },
  open: { fontSize: 16, fontWeight: '600', color: colors.text },
  reconnect: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  reconnectText: { fontSize: 13, color: colors.textSub, textAlign: 'center' },
});
