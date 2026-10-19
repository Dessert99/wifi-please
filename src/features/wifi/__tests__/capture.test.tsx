import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import React from 'react';
import { AppState } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { scanWifiPhoto, ScanError } from '@/features/wifi/services/scan-photo';
import { openSystemWifiDialog, openWifiSettings } from '@/features/wifi/services/connect-wifi';
import { useWifiSession } from '../session';
import { useCapture } from '../use-capture';
import { deleteCachedPhoto } from '../services/photo-cache';
import { hasPhotoConsent, savePhotoConsent } from '@/features/wifi/services/photo-consent';
vi.mock('../services/photo-cache', () => ({ deleteCachedPhoto: vi.fn() }));
vi.mock('@/features/wifi/services/photo-consent', () => ({ hasPhotoConsent: vi.fn(async () => false), savePhotoConsent: vi.fn(async () => {}) }));

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
vi.mock('@/features/wifi/services/connect-wifi', () => ({ openSystemWifiDialog: vi.fn(), correctWithNearbyNetwork: vi.fn(async (wifi: unknown) => wifi), openWifiSettings: vi.fn(async () => {}) }));
vi.mock('@/features/wifi/services/scan-photo', () => ({
  scanWifiPhoto: vi.fn(),
  ScanError: class extends Error {
    constructor(readonly reason: ConstructorParameters<typeof ScanError>[0], readonly retryAt?: number) { super(reason); }
  },
}));
vi.mock('../session', () => ({ useWifiSession: vi.fn() }));

let capture: ReturnType<typeof useCapture>;
let renderer: ReactTestRenderer;
const remember = vi.fn<ReturnType<typeof useWifiSession>['remember']>();
const photo = { uri: 'file:///안내문.jpg', width: 100, height: 100 };
// 안내가 표시됐음을 확인한 뒤 재시도 동작을 검사할 수 있게 반환한다.
function currentDialog() {
  if (!capture.dialog) throw new Error('오류 안내가 표시되지 않았어요.');
  return capture.dialog;
}

// 훅을 실제 React 수명 주기로 실행하고 최신 반환값을 테스트에 노출한다.
function Harness() {
  const value = useCapture();
  React.useLayoutEffect(() => { capture = value; });
  return null;
}

// 가상 시간과 정상 응답을 준비하고 최초 QR 재인식 대기 시간을 지난다.
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
// 훅을 해제하고 타이머·전역 설정을 복원해 테스트 간 영향을 막는다.
afterEach(async () => {
  await act(async () => { renderer.unmount(); });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('시스템 창이 닫힐 때까지 공유 화면을 열지 않고, 취소해도 정보를 공유할 수 있다', async () => {
  let finish!: (result: Awaited<ReturnType<typeof openSystemWifiDialog>>) => void;
  vi.mocked(openSystemWifiDialog).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await choosePhoto();
  expect(openSystemWifiDialog).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();
  expect(capture.busy).toBe(true);
  await act(async () => { finish('canceled'); });
  expect(router.push).toHaveBeenCalledWith('/share');
  expect(capture.busy).toBe(false);
});
it('사진 선택을 연속 눌러도 한 번만 인식하고 연결한다', async () => {
  await act(async () => { capture.pickPhoto(); capture.pickPhoto(); });
  await act(async () => { currentDialog().onPrimary(); });
  expect(launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  expect(scanWifiPhoto).toHaveBeenCalledTimes(1);
  expect(openSystemWifiDialog).toHaveBeenCalledTimes(1);
});
it('정보가 불완전하면 연결 창과 공유 화면을 열지 않는다', async () => {
  vi.mocked(scanWifiPhoto).mockResolvedValue({ ssid: 'Cafe', password: null });
  await choosePhoto();
  expect(openSystemWifiDialog).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
  expect(currentDialog().title).toBe('안내문을 읽지 못했어요');
});
it('연결 창 오류가 나도 정보 보기로 복구한다', async () => {
  vi.mocked(openSystemWifiDialog).mockRejectedValue(new Error('연결 실패'));
  await choosePhoto();
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
  await choosePhoto();
  expect(currentDialog().title).toBe('인터넷 연결이 필요해요');
  await act(async () => { currentDialog().onPrimary(); });
  expect(launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  expect(scanWifiPhoto).toHaveBeenNthCalledWith(2, photo);
  expect(router.push).toHaveBeenCalledWith('/share');
});
it('사진 선택 취소는 연결이나 오류를 만들지 않는다', async () => {
  vi.mocked(launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null });
  await choosePhoto();
  expect(scanWifiPhoto).not.toHaveBeenCalled();
  expect(capture.dialog).toBeNull();
  expect(capture.busy).toBe(false);
});

it('일일 제한에는 초기화 시각을 안내하고 닫은 뒤 QR 연결은 허용한다', async () => {
  vi.mocked(scanWifiPhoto).mockRejectedValueOnce(new ScanError('daily_limit', Date.UTC(2026, 9, 8, 15)));
  await choosePhoto();
  expect(currentDialog().title).toBe('오늘 사진 인식을 모두 사용했어요');
  expect(currentDialog().message).toContain('한국 시각');
  expect(currentDialog().primary).toBe('QR 인식으로 돌아가기');
  expect(currentDialog().secondary).toBeUndefined();
  await act(async () => { currentDialog().onPrimary(); });
  await act(async () => { vi.advanceTimersByTime(1500); capture.onBarcodeScanned({ type: 'qr', data: 'WIFI:S:Cafe;P:12345678;;', cornerPoints: [], bounds: { origin: { x: 0, y: 0 }, size: { width: 100, height: 100 } } }); });
  expect(openSystemWifiDialog).toHaveBeenCalledTimes(1);
  expect(scanWifiPhoto).toHaveBeenCalledTimes(1);
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

// 동의 단계를 거쳐 기존 인식·연결 흐름을 검증한다.
async function choosePhoto() {
  await act(async () => { capture.pickPhoto(); });
  if (capture.dialog?.title === '사진을 AI로 읽을까요?') {
    await act(async () => { currentDialog().onPrimary(); });
  }
}

it('사진 전송 동의 전과 취소 후에는 사진 선택기와 AI를 실행하지 않는다', async () => {
  await act(async () => { capture.pickPhoto(); });
  expect(currentDialog().message).toContain('Anthropic');
  expect(launchImageLibraryAsync).not.toHaveBeenCalled();
  expect(scanWifiPhoto).not.toHaveBeenCalled();
  await act(async () => { capture.closeDialog(); });
  expect(scanWifiPhoto).not.toHaveBeenCalled();
  await act(async () => { capture.pickPhoto(); });
  expect(currentDialog().primary).toBe('동의하고 계속');
});

it('동의하면 기기에 저장하고, 저장된 동의가 있으면 다시 묻지 않는다', async () => {
  await choosePhoto();
  expect(savePhotoConsent).toHaveBeenCalledTimes(1);
  await act(async () => { renderer.unmount(); });
  vi.mocked(hasPhotoConsent).mockResolvedValueOnce(true);
  await act(async () => { renderer = create(<Harness />); });
  await act(async () => { capture.pickPhoto(); });
  expect(capture.dialog).toBeNull();
  expect(launchImageLibraryAsync).toHaveBeenCalledTimes(2);
});

it('연결된 와이파이 공유는 Android 기본 QR 공유를 안내하고 와이파이 설정을 연다', async () => {
  await act(async () => { capture.guideCurrentWifiShare(); });
  expect(currentDialog().message).toContain('QR 코드');
  expect(openWifiSettings).not.toHaveBeenCalled();
  await act(async () => { currentDialog().onPrimary(); });
  expect(openWifiSettings).toHaveBeenCalledTimes(1);
  expect(capture.dialog).toBeNull();
});

it('설정을 열지 못하면 직접 여는 방법을 안내한다', async () => {
  vi.mocked(openWifiSettings).mockRejectedValueOnce(new Error('설정 없음'));
  await act(async () => { capture.guideCurrentWifiShare(); });
  await act(async () => { currentDialog().onPrimary(); });
  expect(currentDialog().title).toBe('설정을 열지 못했어요');
});

it('실패한 사진은 재시도 동안 유지하고 포기하면 캐시를 삭제한다', async () => {
  vi.mocked(scanWifiPhoto).mockRejectedValueOnce(new ScanError('network'));
  await choosePhoto();
  expect(deleteCachedPhoto).not.toHaveBeenCalledWith(photo.uri);
  await act(async () => { capture.closeDialog(); });
  expect(deleteCachedPhoto).toHaveBeenCalledWith(photo.uri);
});

it('인식에 성공하면 시스템 연결 창을 열기 전에 사진 사본을 정리한다', async () => {
  vi.mocked(openSystemWifiDialog).mockImplementationOnce(async () => {
    expect(deleteCachedPhoto).toHaveBeenCalledWith(photo.uri);
    return 'saved';
  });
  await choosePhoto();
  expect(router.push).toHaveBeenCalledWith('/share');
});
