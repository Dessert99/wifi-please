import type { WifiCredentials } from '../types';
import * as SecureStore from 'expo-secure-store';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import WifiManager from '../../../../modules/wifi-manager';
import { matchNearbyNetwork } from '../lib/nearby-network';

// Android 네이티브 연결 창을 열고 네트워크 저장 또는 취소 결과를 반환한다.
export async function openSystemWifiDialog(wifi: WifiCredentials) {
  if (Platform.OS !== 'android' || !WifiManager) {
    throw new Error('시스템 연결은 Android 11 이상 개발 빌드에서 사용할 수 있어요.');
  }
  return WifiManager.openSystemWifiDialog(wifi.ssid, wifi.password, wifi.security, wifi.hidden);
}

const nearbyAskedKey = 'wifi-please-nearby-asked-v1';

// Android 13부터는 위치와 무관한 근처 기기 권한, 그 이전은 정확한 위치 권한으로 와이파이 목록을 읽는다.
function nearbyPermission() {
  return Number(Platform.Version) >= 33 ? PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES : PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
}

// 권한이 없고 이 설치에서 아직 안내하지 않았을 때만 권한 안내가 필요하다.
export async function shouldAskNearbyPermission() {
  if (Platform.OS !== 'android' || !WifiManager?.getNearbyNetworks) return false;
  try {
    if (await PermissionsAndroid.check(nearbyPermission())) return false;
    return await SecureStore.getItemAsync(nearbyAskedKey) === null;
  } catch {
    return false;
  }
}

// 안내에 대한 답을 기록해 다시 묻지 않고, 허용을 고른 경우에만 시스템 권한 창을 연다.
export async function answerNearbyPermissionGuide(allow: boolean) {
  try {
    await SecureStore.setItemAsync(nearbyAskedKey, allow ? 'allowed' : 'skipped');
    if (!allow) return;
    const permission = nearbyPermission();
    const { ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION } = PermissionsAndroid.PERMISSIONS;
    // Android 12는 대략적인 위치를 함께 요청하지 않으면 정확한 위치 요청을 무시한다.
    await PermissionsAndroid.requestMultiple(permission === ACCESS_FINE_LOCATION ? [ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION] : [permission]);
  } catch { /* 권한 없이 인식 값으로 연결한다. */ }
}

// 사진에서 읽은 이름을 주변 실제 네트워크 이름과 보안 방식으로 고친다. 권한이 없거나 검색에 실패하면 인식 값을 그대로 쓴다.
export async function correctWithNearbyNetwork(wifi: WifiCredentials): Promise<WifiCredentials> {
  if (Platform.OS !== 'android' || !WifiManager?.getNearbyNetworks) return wifi;
  try {
    // 대략적인 위치만 허용한 경우에도 와이파이 목록을 읽을 수 없으므로 정확한 권한만 확인한다.
    if (!await PermissionsAndroid.check(nearbyPermission())) return wifi;
    return matchNearbyNetwork(wifi, await WifiManager.getNearbyNetworks());
  } catch {
    return wifi;
  }
}

// 연결된 와이파이를 Android 기본 QR 공유로 보여줄 수 있도록 시스템 와이파이 설정을 연다. 앱은 저장된 비밀번호를 읽을 수 없다.
export async function openWifiSettings() {
  if (Platform.OS !== 'android') throw new Error('와이파이 설정 열기는 Android에서 사용할 수 있어요.');
  await Linking.sendIntent('android.settings.WIFI_SETTINGS');
}
