import { Stack } from 'expo-router';
import { WifiSessionProvider } from '@/features/wifi/session';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <WifiSessionProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </WifiSessionProvider>
  );
}
