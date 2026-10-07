import type { WifiCredentials } from '../types';
import { Platform } from 'react-native';
import WifiManager from '../../../../modules/wifi-manager';

export async function openSystemWifiDialog(wifi: WifiCredentials) {
  if (Platform.OS !== 'android' || !WifiManager) {
    throw new Error('시스템 연결은 Android 11 이상 개발 빌드에서 사용할 수 있어요.');
  }
  return WifiManager.openSystemWifiDialog(wifi.ssid, wifi.password, wifi.security, wifi.hidden);
}
