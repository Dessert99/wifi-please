import { requireOptionalNativeModule } from 'expo';

export default requireOptionalNativeModule<{
  openSystemWifiDialog(ssid: string, password: string, security: string, hidden: boolean): Promise<'saved' | 'canceled'>;
}>('WifiManager');
