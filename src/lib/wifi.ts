import { Alert } from 'react-native';

export type WifiCredentials = {
  ssid: string;
  password: string;
};

// 시스템 와이파이 연결 창을 띄운다.
// TODO: Android ACTION_WIFI_ADD_NETWORKS 네이티브 모듈(modules/wifi-manager)로 교체
export function openSystemWifiDialog({ ssid, password }: WifiCredentials) {
  Alert.alert('시스템 와이파이 창 (임시)', `${ssid} / ${password}`);
}
