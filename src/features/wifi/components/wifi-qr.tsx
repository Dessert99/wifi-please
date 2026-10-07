import { useWindowDimensions, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { WifiCredentials } from '@/features/wifi/types';
import { createWifiQr } from '@/features/wifi/lib/wifi-qr';

// 화면 너비에 맞춰 크기를 제한하고 스캔에 필요한 여백을 둔 QR을 표시한다.
export function WifiQr({ wifi, large = false }: { wifi: WifiCredentials; large?: boolean }) {
  const { width } = useWindowDimensions();
  const size = Math.min(large ? 246 : 172, width - 136);
  return <View accessible accessibilityLabel={`${wifi.ssid} 연결용 QR 코드`} style={{ padding: 20, backgroundColor: 'white', alignSelf: 'center', borderRadius: 16 }}>
    <QRCode value={createWifiQr(wifi)} size={size} color="#000000" backgroundColor="#FFFFFF" ecl="M" quietZone={16} />
  </View>;
}
