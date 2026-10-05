import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashIcon } from '@/components/icons';
import { ScanFrame } from '@/components/scan-frame';
import { ShutterButton } from '@/components/shutter-button';
import { colors } from '@/constants/theme';
import { openSystemWifiDialog } from '@/lib/wifi';

// 글자 인식을 붙이기 전까지 쓰는 임시 인식 결과
const SAMPLE_RESULT = { ssid: 'cafe_onda_5G', password: 'onda2024!' };

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const [flashOn, setFlashOn] = useState(false);

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

      {/* 카메라 미리보기 자리 */}
      <View style={styles.preview}>
        <View style={styles.hint}>
          <Text style={styles.hintText}>안내문이나 QR 코드를 틀 안에 맞춰주세요</Text>
        </View>
        <ScanFrame />
      </View>

      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => openSystemWifiDialog(SAMPLE_RESULT)}
          accessibilityRole="button"
          accessibilityLabel="갤러리에서 사진 고르기"
          style={styles.galleryButton}
        />
        <ShutterButton onPress={() => openSystemWifiDialog(SAMPLE_RESULT)} />
        <View style={styles.sideSpacer} />
      </View>
    </View>
  );
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
    backgroundColor: '#2A221C',
  },
  hint: {
    position: 'absolute',
    top: 24,
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
});
