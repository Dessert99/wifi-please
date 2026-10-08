import { CameraView } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashIcon, Icon } from '@/components/ui/icon';
import { ScanFrame } from '@/features/wifi/components/scan-frame';
import { ShutterButton } from '@/features/wifi/components/shutter-button';
import { Dialog } from '@/components/ui/dialog';
import { colors } from '@/constants/theme';
import { CameraPermission } from '@/features/wifi/components/camera-permission';
import { useCapture } from '@/features/wifi/use-capture';

// 카메라 권한과 촬영 상태에 맞춰 화면을 구성하고 사용자 입력을 촬영 훅에 연결한다.
export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const { cameraRef, ...capture } = useCapture();
  const [flash, setFlash] = useState(false);
  const { permission, busy } = capture;
  // 권한 확인이 끝나기 전에는 카메라 대신 로딩 상태를 표시한다.
  if (!permission) return <View style={[styles.screen, { justifyContent: 'center' }]}><ActivityIndicator color={colors.accent} /></View>;
  return <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: permission.granted ? colors.camera : colors.background }]}>
    <StatusBar style={permission.granted ? 'light' : 'dark'} />
    {!permission.granted ? (
      <CameraPermission
        canAskAgain={permission.canAskAgain}
        busy={busy}
        onAllow={capture.allowCamera}
        onPickPhoto={capture.pickPhoto}
      />
    ) : <>
      <View style={styles.topBar}><Text style={styles.brand}>WiFi Please</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="플래시" accessibilityState={{ selected: flash }} onPress={() => setFlash(!flash)} style={[styles.flash, flash && { backgroundColor: 'white' }]}><FlashIcon color={flash ? colors.camera : 'white'} /></Pressable>
      </View>
      <View style={styles.preview}>
        {/* 촬영 중 스캐너를 끄면 Android 카메라가 재생성되므로 QR 결과 차단은 훅에서 처리한다. */}
        {capture.cameraActive && <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={flash && !busy} onCameraReady={() => capture.setReady(true)} onMountError={capture.cameraError} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={capture.onBarcodeScanned} />}
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
    <Pressable accessibilityRole="button" accessibilityLabel="개인정보처리방침" disabled={busy} onPress={() => router.push('/privacy')} style={styles.privacy}>
      <Text style={{ color: permission.granted ? 'white' : colors.text, fontSize: 12 }}>개인정보처리방침</Text>
    </Pressable>
    <Dialog value={capture.dialog} onClose={capture.closeDialog} />
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  privacy: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  container: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 6 },
  brand: { color: 'white', fontSize: 18, fontWeight: '800' },
  flash: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF20' },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#17191C' },
  hint: { position: 'absolute', top: 24, left: 12, right: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, padding: 12, borderRadius: 24, backgroundColor: '#00000088' },
  hintText: { color: 'white', fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  cameraNote: { position: 'absolute', bottom: 30, fontSize: 12, color: 'white', backgroundColor: '#00000088', padding: 8, borderRadius: 12 },
  bottomBar: { height: 124, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26 },
  captureAction: { width: 64, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionLabel: { color: 'white', fontSize: 11, fontWeight: '600' },
});
