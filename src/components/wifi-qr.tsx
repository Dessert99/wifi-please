import { useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { WifiCredentials } from '@/lib/wifi';
import { createWifiQr } from '@/lib/wifi-qr';

export function WifiQr({ wifi, large = false }: { wifi: WifiCredentials; large?: boolean }) {
  const { width } = useWindowDimensions();
  const size = Math.min(large ? 246 : 172, width - 136);
  return <View accessible accessibilityLabel={`${wifi.ssid} 연결용 QR 코드`} style={{ padding: 20, backgroundColor: 'white', alignSelf: 'center', borderRadius: 16 }}>
    <QRCode value={createWifiQr(wifi)} size={size} color="#000000" backgroundColor="#FFFFFF" ecl="M" quietZone={16} />
  </View>;
}
