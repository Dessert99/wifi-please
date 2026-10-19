import { requireOptionalNativeModule } from 'expo';

export type NearbyNetwork = { ssid: string; capabilities: string; level: number };

// 네이티브 모듈이 없는 플랫폼에서도 import할 수 있게 선택적으로 불러온다.
export default requireOptionalNativeModule<{
  openSystemWifiDialog(ssid: string, password: string, security: string, hidden: boolean): Promise<'saved' | 'canceled'>;
  getNearbyNetworks?(): Promise<NearbyNetwork[]>;
}>('WifiManager');
