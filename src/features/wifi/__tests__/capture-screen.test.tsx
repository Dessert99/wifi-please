import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import { CameraView } from 'expo-camera';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import CaptureScreen from '@/app/index';
import { WifiSessionProvider } from '../session';
import { scanWifiPhoto } from '../services/scan-photo';
import { openSystemWifiDialog } from '../services/connect-wifi';
import { Dialog } from '@/components/ui/dialog';
vi.mock('../services/photo-cache', () => ({ deleteCachedPhoto: vi.fn() }));
vi.mock('../services/photo-consent', () => ({ hasPhotoConsent: vi.fn(async () => false), savePhotoConsent: vi.fn(async () => {}) }));

const camera = vi.hoisted(() => ({ takePicture: vi.fn(), abort: vi.fn() }));

// 네이티브 표시 요소만 대체하고 화면, 촬영 훅, 세션은 함께 실행한다.
vi.mock('react-native', () => ({
  View: 'View', Text: 'Text', Pressable: 'Pressable', Modal: 'Modal',
  ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (styles: unknown) => styles, absoluteFill: {} },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: vi.fn() }) },
  Linking: { openSettings: vi.fn() },
}));
vi.mock('react-native-svg', () => ({ default: 'Svg', Circle: 'Circle', Path: 'Path', Rect: 'Rect' }));
vi.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
vi.mock('expo-status-bar', () => ({ StatusBar: () => null }));
vi.mock('expo-image', () => ({ Image: 'Image' }));
vi.mock('expo-image-picker', () => ({ launchImageLibraryAsync: vi.fn() }));
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react');
  return { router: { push: vi.fn() }, useFocusEffect: (effect: React.EffectCallback) => useEffect(effect, [effect]) };
});
vi.mock('expo-camera', async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import('react');
  const getPermission = vi.fn();
  return {
    useCameraPermissions: () => [{ granted: true, canAskAgain: true }, vi.fn(), getPermission],
    CameraView: forwardRef(function Camera({ onCameraReady, onBarcodeScanned }: { onCameraReady?: () => void; onBarcodeScanned?: unknown }, ref) {
      useImperativeHandle(ref, () => ({ takePictureAsync: camera.takePicture }), []);
      useEffect(() => { onCameraReady?.(); }, [onCameraReady]);
      const scannerEnabled = !!onBarcodeScanned;
      // Android에서는 스캐너를 끌 때 카메라가 재생성되어 진행 중인 촬영이 취소된다.
      useEffect(() => { if (!scannerEnabled) camera.abort(); }, [scannerEnabled]);
      return null;
    }),
  };
});
vi.mock('../services/scan-photo', () => ({ scanWifiPhoto: vi.fn(), ScanError: class extends Error {} }));
vi.mock('../services/connect-wifi', () => ({ openSystemWifiDialog: vi.fn(), correctWithNearbyNetwork: vi.fn(async (wifi: unknown) => wifi), openWifiSettings: vi.fn() }));

let renderer: ReactTestRenderer | undefined;

// 화면과 가상 시간을 정리해 다른 테스트에 영향을 주지 않는다.
afterEach(async () => {
  await act(async () => { renderer?.unmount(); });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('촬영 중 QR 입력은 무시하면서 카메라를 재설정하지 않고 사진 인식을 마친다', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const photo = { uri: 'file:///test.jpg', width: 100, height: 100 };
  let finishPhoto!: (value: typeof photo) => void;
  camera.takePicture.mockImplementation(() => new Promise((resolve, reject) => {
    finishPhoto = resolve;
    camera.abort.mockImplementation(() => reject(new Error('촬영 중 카메라가 재설정됐어요.')));
  }));
  vi.mocked(scanWifiPhoto).mockResolvedValue({ ssid: 'Cafe', password: '12345678' });
  vi.mocked(openSystemWifiDialog).mockResolvedValue('saved');
  await act(async () => { renderer = create(<WifiSessionProvider><CaptureScreen /></WifiSessionProvider>); });
  vi.advanceTimersByTime(2000);
  const shutter = renderer!.root.findAllByType(Pressable).find(node => node.props.accessibilityLabel === '촬영');
  expect(shutter?.props.disabled).toBe(false);
  await act(async () => { shutter!.props.onPress(); });
  expect(camera.takePicture).not.toHaveBeenCalled();
  await act(async () => { renderer!.root.findByType(Dialog).props.value.onPrimary(); });
  expect(camera.takePicture).toHaveBeenCalledTimes(1);
  expect(camera.abort).not.toHaveBeenCalled();
  await act(async () => {
    renderer!.root.findByType(CameraView).props.onBarcodeScanned({ data: 'WIFI:S:Other;P:abcdefgh;T:WPA;;' });
  });
  expect(openSystemWifiDialog).not.toHaveBeenCalled();
  await act(async () => { finishPhoto(photo); });
  expect(scanWifiPhoto).toHaveBeenCalledWith(photo);
  expect(openSystemWifiDialog).toHaveBeenCalledTimes(1);
  expect(router.push).toHaveBeenCalledWith('/share');
});
