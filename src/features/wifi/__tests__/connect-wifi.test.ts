import { beforeEach, expect, it, vi } from 'vitest';
import { PermissionsAndroid, Platform } from 'react-native';
import { correctWithNearbyNetwork } from '../services/connect-wifi';

const native = vi.hoisted(() => ({ getNearbyNetworks: vi.fn(), openSystemWifiDialog: vi.fn() }));
// 권한 API와 네이티브 모듈만 대체하고 권한 판단과 이름 보정은 실제 구현으로 검사한다.
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
vi.mock('../../../../modules/wifi-manager', () => ({ default: native }));

const wifi = { ssid: 'Cafe Onda', password: 'onda2024!', security: 'WPA', hidden: false };
beforeEach(() => {
  Platform.Version = 33;
  vi.mocked(PermissionsAndroid.check).mockResolvedValue(false);
  native.getNearbyNetworks.mockResolvedValue([{ ssid: 'CAFE_ONDA_5G', capabilities: '[WPA2-PSK-CCMP]', level: -40 }]);
});

it('Android 13 이상은 근처 기기 권한만 요청하고 허용되면 실제 이름으로 고친다', async () => {
  vi.mocked(PermissionsAndroid.requestMultiple).mockResolvedValue({ nearby: 'granted' } as never);
  expect((await correctWithNearbyNetwork(wifi)).ssid).toBe('CAFE_ONDA_5G');
  expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith(['nearby']);
});

it('Android 12 이하는 정확한 위치와 대략적인 위치를 함께 요청한다', async () => {
  Platform.Version = 31;
  vi.mocked(PermissionsAndroid.requestMultiple).mockResolvedValue({ fine: 'granted', coarse: 'granted' } as never);
  expect((await correctWithNearbyNetwork(wifi)).ssid).toBe('CAFE_ONDA_5G');
  expect(PermissionsAndroid.requestMultiple).toHaveBeenCalledWith(['fine', 'coarse']);
});

it('대략적인 위치만 허용하거나 거부하면 검색하지 않고 인식 값을 유지한다', async () => {
  Platform.Version = 31;
  vi.mocked(PermissionsAndroid.requestMultiple).mockResolvedValue({ fine: 'denied', coarse: 'granted' } as never);
  expect(await correctWithNearbyNetwork(wifi)).toEqual(wifi);
  expect(native.getNearbyNetworks).not.toHaveBeenCalled();
});

it('이미 허용된 권한은 다시 묻지 않고, 검색 실패는 인식 값으로 복구한다', async () => {
  vi.mocked(PermissionsAndroid.check).mockResolvedValue(true);
  native.getNearbyNetworks.mockRejectedValueOnce(new Error('검색 실패'));
  expect(await correctWithNearbyNetwork(wifi)).toEqual(wifi);
  expect(PermissionsAndroid.requestMultiple).not.toHaveBeenCalled();
});
