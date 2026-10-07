import { CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashIcon } from '@/components/icons';
import { ScanFrame } from '@/components/scan-frame';
import { ShutterButton } from '@/components/shutter-button';
import { BrandMark, Button, Dialog, Icon, ui } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useCapture } from '@/features/wifi/use-capture';

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const { cameraRef, ...capture } = useCapture();
  const [flash, setFlash] = useState(false);
  const { permission, busy } = capture;
  if (!permission) return <View style={[ui.screen, { justifyContent: 'center' }]}><ActivityIndicator color={colors.accent} /></View>;
  const denied = !permission.canAskAgain;
  return <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: permission.granted ? colors.camera : colors.background }]}>
    <StatusBar style={permission.granted ? 'light' : 'dark'} />
    {!permission.granted ? <>
      <Text style={styles.lightBrand}>Snapfi</Text>
      <ScrollView contentContainerStyle={styles.permissionContent}>
        <BrandMark />
        <Text accessibilityRole="header" style={styles.permissionTitle}>{denied ? '카메라를 켜면\n바로 찍을 수 있어요' : '한 번 찍고,\n함께 연결해요'}</Text>
        <Text style={[ui.description, { textAlign: 'center' }]}>{denied ? '설정에서 카메라 권한을 허용해 주세요.\n저장된 사진으로도 시작할 수 있어요.' : '카페 와이파이 안내문을 찍으면\n직접 입력할 필요 없이 연결해요.'}</Text>
        {busy && <ActivityIndicator color={colors.accent} />}
      </ScrollView>
      <View style={[ui.footer, { paddingBottom: 16 }]}>
        <Button title={denied ? '설정에서 허용하기' : '카메라 허용하기'} onPress={capture.allowCamera} disabled={busy} />
        <Button title={busy ? '사진을 읽는 중이에요' : '사진에서 찾기'} secondary onPress={capture.pickPhoto} disabled={busy} />
        <Text style={styles.footnote}>사진 인식에는 인터넷이 필요해요</Text>
      </View>
    </> : <>
      <View style={styles.topBar}><Text style={styles.brand}>Snapfi</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="플래시" accessibilityState={{ selected: flash }} onPress={() => setFlash(!flash)} style={[styles.flash, flash && { backgroundColor: 'white' }]}><FlashIcon color={flash ? colors.camera : 'white'} /></Pressable>
      </View>
      <View style={styles.preview}>
        {capture.cameraActive && <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={flash && !busy} onCameraReady={() => capture.setReady(true)} onMountError={capture.cameraError} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={busy || capture.dialog ? undefined : capture.onBarcodeScanned} />}
        <View style={styles.hint}>
          {busy && <ActivityIndicator size="small" color="white" />}
          <Text style={styles.hintText}>{capture.stage === 'photo' ? '와이파이 정보를 읽는 중이에요' : capture.stage === 'connecting' ? '시스템 연결 창을 여는 중이에요' : '안내문이나 QR을 틀 안에 맞춰주세요'}</Text>
        </View>
        <ScanFrame />
        <Text style={styles.cameraNote}>{capture.stage === 'photo' ? '곧 시스템 연결 창이 열려요' : 'QR은 비추기만 하면 인식해요'}</Text>
      </View>
      <View style={styles.bottomBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="사진 선택" disabled={busy} onPress={capture.pickPhoto} style={[styles.captureAction, busy && { opacity: .35 }]}><Icon name="photo" color="white" size={27} /><Text style={styles.actionLabel}>사진 선택</Text></Pressable>
        <ShutterButton onPress={capture.takePhoto} disabled={busy || !capture.ready} />
        <Pressable accessibilityRole="button" accessibilityLabel="최근 와이파이 정보" disabled={busy || !capture.wifi} onPress={capture.showInfo} style={[styles.captureAction, (busy || !capture.wifi) && { opacity: .35 }]}><Icon name="share" color="white" size={27} /><Text style={styles.actionLabel}>최근 정보</Text></Pressable>
      </View>
    </>}
    <Dialog value={capture.dialog} onClose={capture.closeDialog} />
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 6 },
  brand: { color: 'white', fontSize: 18, fontWeight: '800' },
  lightBrand: { color: colors.text, fontSize: 20, fontWeight: '800', padding: 24 },
  flash: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF20' },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#17191C' },
  hint: { position: 'absolute', top: 24, left: 12, right: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, padding: 12, borderRadius: 24, backgroundColor: '#00000088' },
  hintText: { color: 'white', fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  cameraNote: { position: 'absolute', bottom: 30, fontSize: 12, color: 'white', backgroundColor: '#00000088', padding: 8, borderRadius: 12 },
  bottomBar: { height: 124, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26 },
  captureAction: { width: 64, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionLabel: { color: 'white', fontSize: 11, fontWeight: '600' },
  permissionContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 22 },
  permissionTitle: { fontSize: 30, lineHeight: 41, fontWeight: '800', letterSpacing: -.9, textAlign: 'center', color: colors.text, marginTop: 8 },
  footnote: { color: colors.textSub, fontSize: 11, textAlign: 'center', marginTop: 10 },
});
