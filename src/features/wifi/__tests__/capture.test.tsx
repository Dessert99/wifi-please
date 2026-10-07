import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import React from 'react';
import { AppState } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { scanWifiPhoto, ScanError } from '@/features/wifi/services/scan-photo';
import { openSystemWifiDialog } from '@/features/wifi/services/connect-wifi';
import { useWifiSession } from '../session';
import { useCapture } from '../use-capture';

// 기기 API만 대체하고 React 훅과 비동기 흐름은 실제 구현으로 검사한다.
vi.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
  Linking: { openSettings: vi.fn() },
}));
vi.mock('expo-camera', () => {
  const getPermission = vi.fn();
  return { useCameraPermissions: () => [{ granted: true, canAskAgain: true }, vi.fn(), getPermission] };
});
vi.mock('expo-image-picker', () => ({ launchImageLibraryAsync: vi.fn() }));
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react');
  return {
    router: { push: vi.fn() },
    useFocusEffect: (effect: React.EffectCallback) => useEffect(effect, [effect]),
  };
});
vi.mock('@/features/wifi/services/connect-wifi', () => ({ openSystemWifiDialog: vi.fn() }));
vi.mock('@/features/wifi/services/scan-photo', () => ({
  scanWifiPhoto: vi.fn(),
  ScanError: class extends Error {
    constructor(readonly reason: ConstructorParameters<typeof ScanError>[0]) { super(reason); }
  },
}));
vi.mock('../session', () => ({ useWifiSession: vi.fn() }));

let capture: ReturnType<typeof useCapture>;
let renderer: ReactTestRenderer;
const remember = vi.fn<ReturnType<typeof useWifiSession>['remember']>();
const photo = { uri: 'file:///안내문.jpg', width: 100, height: 100 };
function currentDialog() {
  if (!capture.dialog) throw new Error('오류 안내가 표시되지 않았어요.');
  return capture.dialog;
}

function Harness() {
  const value = useCapture();
  React.useLayoutEffect(() => { capture = value; });
  return null;
}

beforeEach(async () => {
  vi.useFakeTimers({ now: 10000 });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  AppState.currentState = 'active';
  vi.mocked(useWifiSession).mockReturnValue({ wifi: null, remember });
  vi.mocked(launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [photo] });
  vi.mocked(scanWifiPhoto).mockResolvedValue({ ssid: 'Cafe', password: '12345678' });
  vi.mocked(openSystemWifiDialog).mockResolvedValue('saved');
  await act(async () => { renderer = create(<Harness />); });
  vi.advanceTimersByTime(2000);
});
afterEach(async () => {
  await act(async () => { renderer.unmount(); });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('시스템 창이 닫힐 때까지 공유 화면을 열지 않고, 취소해도 정보를 공유할 수 있다', async () => {
  let finish!: (result: Awaited<ReturnType<typeof openSystemWifiDialog>>) => void;
  vi.mocked(openSystemWifiDialog).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { capture.pickPhoto(); });
  expect(openSystemWifiDialog).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();
  expect(capture.busy).toBe(true);
  await act(async () => { finish('canceled'); });
  expect(router.push).toHaveBeenCalledWith('/share');
  expect(capture.busy).toBe(false);
});
it('사진 선택을 연속 눌러도 한 번만 인식하고 연결한다', async () => {
  await act(async () => { capture.pickPhoto(); capture.pickPhoto(); });
  expect(launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  expect(scanWifiPhoto).toHaveBeenCalledTimes(1);
  expect(openSystemWifiDialog).toHaveBeenCalledTimes(1);
});
it('정보가 불완전하면 연결 창과 공유 화면을 열지 않는다', async () => {
  vi.mocked(scanWifiPhoto).mockResolvedValue({ ssid: 'Cafe', password: null });
  await act(async () => { capture.pickPhoto(); });
  expect(openSystemWifiDialog).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
  expect(currentDialog().title).toBe('안내문을 읽지 못했어요');
});
it('연결 창 오류가 나도 정보 보기로 복구한다', async () => {
  vi.mocked(openSystemWifiDialog).mockRejectedValue(new Error('연결 실패'));
  await act(async () => { capture.pickPhoto(); });
  expect(remember).toHaveBeenCalledWith(expect.objectContaining({ ssid: 'Cafe' }));
  expect(router.push).not.toHaveBeenCalled();
  await act(async () => { const dialog = currentDialog();
    if (!dialog.onSecondary) throw new Error('보조 동작이 없어요.');
    dialog.onSecondary(); });
  expect(router.push).toHaveBeenCalledWith('/share');
});
it('QR은 서버를 거치지 않고 보안 방식과 숨김 여부를 보존한다', async () => {
  const qr: Parameters<typeof capture.onBarcodeScanned>[0] = {
    type: 'qr',
    data: 'WIFI:S:Hidden;P:abcdefgh;T:SAE;H:true;;',
    cornerPoints: [],
    bounds: { origin: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
  };
  await act(async () => {
    capture.onBarcodeScanned(qr);
    capture.onBarcodeScanned(qr);
  });
  expect(scanWifiPhoto).not.toHaveBeenCalled();
  expect(openSystemWifiDialog).toHaveBeenCalledTimes(1);
  expect(openSystemWifiDialog).toHaveBeenCalledWith({ ssid: 'Hidden', password: 'abcdefgh', security: 'SAE', hidden: true });
});
it('인터넷 연결 실패 후 재시도는 같은 사진을 사용한다', async () => {
  vi.mocked(scanWifiPhoto).mockRejectedValueOnce(new ScanError('network'));
  await act(async () => { capture.pickPhoto(); });
  expect(currentDialog().title).toBe('인터넷 연결이 필요해요');
  await act(async () => { currentDialog().onPrimary(); });
  expect(launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  expect(scanWifiPhoto).toHaveBeenNthCalledWith(2, photo);
  expect(router.push).toHaveBeenCalledWith('/share');
});
it('사진 선택 취소는 연결이나 오류를 만들지 않는다', async () => {
  vi.mocked(launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null });
  await act(async () => { capture.pickPhoto(); });
  expect(scanWifiPhoto).not.toHaveBeenCalled();
  expect(capture.dialog).toBeNull();
  expect(capture.busy).toBe(false);
});

it('앱이 비활성화되면 카메라를 멈추고 복귀 직후에는 QR 재인식을 잠시 막는다', async () => {
  const onStateChange = vi.mocked(AppState.addEventListener).mock.calls[0]?.[1];
  if (!onStateChange) throw new Error('앱 상태 구독이 등록되지 않았어요.');
  const qr: Parameters<typeof capture.onBarcodeScanned>[0] = {
    type: 'qr',
    data: 'WIFI:S:Cafe;P:12345678;T:WPA;;',
    cornerPoints: [],
    bounds: { origin: { x: 0, y: 0 }, size: { width: 100, height: 100 } },
  };

  await act(async () => { capture.setReady(true); });
  expect(capture.cameraActive).toBe(true);
  await act(async () => { onStateChange('background'); });
  expect(capture.cameraActive).toBe(false);
  expect(capture.ready).toBe(false);
  await act(async () => { capture.onBarcodeScanned(qr); });
  expect(openSystemWifiDialog).not.toHaveBeenCalled();

  await act(async () => { onStateChange('active'); });
  expect(capture.cameraActive).toBe(true);
  await act(async () => { capture.onBarcodeScanned(qr); });
  expect(openSystemWifiDialog).not.toHaveBeenCalled();
  await act(async () => { vi.advanceTimersByTime(1500); capture.onBarcodeScanned(qr); });
  expect(openSystemWifiDialog).toHaveBeenCalledTimes(1);
  expect(AppState.addEventListener).toHaveBeenCalledTimes(1);
});
