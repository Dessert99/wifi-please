import type { WifiCredentials } from '../types';
import { Platform } from 'react-native';
import WifiManager from '../../../../modules/wifi-manager';

// Android 네이티브 연결 창을 열고 네트워크 저장 또는 취소 결과를 반환한다.
export async function openSystemWifiDialog(wifi: WifiCredentials) {
  if (Platform.OS !== 'android' || !WifiManager) {
    throw new Error('시스템 연결은 Android 11 이상 개발 빌드에서 사용할 수 있어요.');
  }
  return WifiManager.openSystemWifiDialog(wifi.ssid, wifi.password, wifi.security, wifi.hidden);
}
