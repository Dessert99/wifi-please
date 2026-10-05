import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashIcon } from '@/components/icons';
import { ScanFrame } from '@/components/scan-frame';
import { ShutterButton } from '@/components/shutter-button';
import { colors } from '@/constants/theme';
import { parseWifiQr } from '@/lib/parse-wifi-qr';
import { scanWifiPhoto, ScanError, type Photo, type ScanResult } from '@/lib/scan-api';
import { openSystemWifiDialog } from '@/lib/wifi';

// 같은 QR이 카메라에 계속 비쳐도 연결 창이 반복해서 뜨지 않게 하는 간격
const QR_COOLDOWN_MS = 5000;

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(false);
  const lastQrAt = useRef(0);

  // 사진(촬영 또는 갤러리)을 서버로 보내 인식하고, 성공하면 시스템 와이파이 창을 띄운다.
  const scanPhoto = async (photo: Photo) => {
    setScanning(true);
    try {
      connectWithResult(await scanWifiPhoto(photo));
    } catch (error) {
      Alert.alert('인식하지 못했어요', scanErrorMessage(error));
    } finally {
      setScanning(false);
    }
  };

  const takePicture = async () => {
    if (scanning || !cameraRef.current) return;
    const picture = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    await scanPhoto(picture);
  };

  const pickFromGallery = async () => {
    if (scanning) return;
    const result = await launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (!result.canceled) await scanPhoto(result.assets[0]);
  };

  // QR 코드는 서버 없이 바로 읽는다.
  const onBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    const now = Date.now();
    if (scanning || now - lastQrAt.current < QR_COOLDOWN_MS) return;
    const qr = parseWifiQr(data);
    if (!qr) return;
    lastQrAt.current = now;
    openSystemWifiDialog({ ssid: qr.ssid, password: qr.password });
  };

  // 권한 상태를 불러오는 중
  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permission]}>
        <StatusBar style="light" />
        <Text style={styles.permissionText}>와이파이 안내문을 찍으려면{'\n'}카메라 권한이 필요해요</Text>
        <Pressable onPress={requestPermission} accessibilityRole="button" style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>카메라 허용하기</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      <View style={styles.topBar}>
        <Text style={styles.brand}>Snapfi</Text>
        <Pressable
          onPress={() => setFlashOn((on) => !on)}
          accessibilityRole="button"
          accessibilityLabel="플래시"
          style={[styles.iconButton, flashOn && styles.iconButtonOn]}>
          <FlashIcon color={flashOn ? colors.camera : '#FFFFFF'} />
        </Pressable>
      </View>

      <View style={styles.preview}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={flashOn}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={onBarcodeScanned}
        />
        <View style={styles.hint}>
          {scanning && <ActivityIndicator size="small" color="#FFFFFF" />}
          <Text style={styles.hintText}>
            {scanning ? '와이파이 정보를 읽는 중이에요' : '안내문이나 QR 코드를 틀 안에 맞춰주세요'}
          </Text>
        </View>
        <ScanFrame />
      </View>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={pickFromGallery}
          disabled={scanning}
          accessibilityRole="button"
          accessibilityLabel="갤러리에서 사진 고르기"
          style={styles.galleryButton}
        />
        <ShutterButton onPress={takePicture} disabled={scanning} />
        <View style={styles.sideSpacer} />
      </View>
    </View>
  );
}

// 인식 결과로 시스템 와이파이 창을 띄운다. 이름이나 비밀번호를 못 찾으면 다시 찍어달라고 안내한다.
function connectWithResult({ ssid, password }: ScanResult) {
  if (!ssid) {
    Alert.alert('인식하지 못했어요', '와이파이 이름을 찾지 못했어요. 안내문이 잘 보이게 다시 찍어주세요.');
    return;
  }
  if (password === null) {
    Alert.alert('인식하지 못했어요', '비밀번호를 찾지 못했어요. 안내문이 잘 보이게 다시 찍어주세요.');
    return;
  }
  openSystemWifiDialog({ ssid, password });
}

function scanErrorMessage(error: unknown) {
  if (error instanceof ScanError) {
    if (error.reason === 'network') return '인터넷 연결을 확인하고 다시 시도해 주세요.';
    if (error.reason === 'rate_limited') return '잠시 후 다시 시도해 주세요.';
  }
  return '문제가 생겼어요. 다시 시도해 주세요.';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.camera,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  iconButtonOn: {
    backgroundColor: '#FFFFFF',
  },
  preview: {
    flex: 1,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#2A221C',
  },
  hint: {
    position: 'absolute',
    top: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  hintText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomBar: {
    height: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
  },
  galleryButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    backgroundColor: '#5A4636',
  },
  sideSpacer: {
    width: 44,
  },
  permission: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 32,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  permissionButtonText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: '700',
  },
});
