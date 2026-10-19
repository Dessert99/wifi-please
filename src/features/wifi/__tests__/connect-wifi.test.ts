import { beforeEach, expect, it, vi } from 'vitest';
import * as SecureStore from 'expo-secure-store';
import { PermissionsAndroid, Platform } from 'react-native';
import { answerNearbyPermissionGuide, correctWithNearbyNetwork, shouldAskNearbyPermission } from '../services/connect-wifi';

const native = vi.hoisted(() => ({ getNearbyNetworks: vi.fn(), openSystemWifiDialog: vi.fn() }));
// 권한 API·보안 저장소·네이티브 모듈만 대체하고 권한 판단과 이름 보정은 실제 구현으로 검사한다.
vi.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 33 },
  Linking: { sendIntent: vi.fn() },
  PermissionsAndroid: {
    PERMISSIONS: { NEARBY_WIFI_DEVICES: 'nearby', ACCESS_FINE_LOCATION: 'fine', ACCESS_COARSE_LOCATION: 'coarse' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
    check: vi.fn(),
    requestMultiple: vi.fn(),
  },
}));
vi.mock('expo-secure-store', () => ({ getItemAsync: vi.fn(), setItemAsync: vi.fn() }));
vi.mock('../../../../modules/wifi-manager', () => ({ default: native }));

const wifi = { ssid: 'Cafe Onda', password: 'onda2024!', security: 'WPA', hidden: false };
beforeEach(() => {
  Platform.Version = 33;
  vi.mocked(PermissionsAndroid.check).mockResolvedValue(false);
  vi.mocked(SecureStore.getItemAsync).mockResolvedValue(null);
  native.getNearbyNetworks.mockResolvedValue([{ ssid: 'CAFE_ONDA_5G', capabilities: '[WPA2-PSK-CCMP]', level: -40 }]);
});

it('권한이 없고 아직 안내하지 않은 설치에서만 안내가 필요하다', async () => {
  expect(await shouldAskNearbyPermission()).toBe(true);
  vi.mocked(SecureStore.getItemAsync).mockResolvedValueOnce('skipped');
  expect(await shouldAskNearbyPermission()).toBe(false);
  vi.mocked(PermissionsAndroid.check).mockResolvedValueOnce(true);
  expect(await shouldAskNearbyPermission()).toBe(false);
});

it('건너뛰기를 고르면 답만 기록하고 시스템 권한 창을 열지 않는다', async () => {
  await answerNearbyPermissionGuide(false);
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('wifi-please-nearby-asked-v1', 'skipped');
  expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
});

it('Android 13 이상은 근처 기기 권한만, 12 이하는 정확한·대략적 위치를 함께 요청한다', async () => {
  await answerNearbyPermissionGuide(true);
  expect(PermissionsAndroid.requestMultiple).toHaveBeenLastCalledWith(['nearby']);
  Platform.Version = 31;
  await answerNearbyPermissionGuide(true);
  expect(PermissionsAndroid.requestMultiple).toHaveBeenLastCalledWith(['fine', 'coarse']);
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('wifi-please-nearby-asked-v1', 'allowed');
});

it('권한이 있으면 다시 묻지 않고 실제 이름으로 고친다', async () => {
  vi.mocked(PermissionsAndroid.check).mockResolvedValue(true);
  expect((await correctWithNearbyNetwork(wifi)).ssid).toBe('CAFE_ONDA_5G');
  expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
});

it('정확한 권한이 없거나 검색에 실패하면 인식 값을 유지한다', async () => {
  expect(await correctWithNearbyNetwork(wifi)).toEqual(wifi);
  expect(native.getNearbyNetworks).not.toHaveBeenCalled();
  vi.mocked(PermissionsAndroid.check).mockResolvedValue(true);
  native.getNearbyNetworks.mockRejectedValueOnce(new Error('검색 실패'));
  expect(await correctWithNearbyNetwork(wifi)).toEqual(wifi);
});
