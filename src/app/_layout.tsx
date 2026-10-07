import { Stack } from 'expo-router';
import { WifiSessionProvider } from '@/features/wifi/session';
import { colors } from '@/constants/theme';

// 모든 화면이 같은 메모리 세션을 사용하도록 Provider와 라우터를 구성한다.
export default function RootLayout() {
  return (
    <WifiSessionProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </WifiSessionProvider>
  );
}
