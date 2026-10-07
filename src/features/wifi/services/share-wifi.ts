import { Share } from 'react-native';

import type { WifiCredentials } from '@/features/wifi/types';

// 공유 앱과 받는 사람은 시스템 공유 창 및 선택한 앱에서 사용자가 고른다.
export function shareWifiCredentials({ ssid, password }: WifiCredentials) {
  return Share.share(
    {
      title: '와이파이 정보',
      message: `와이파이 이름\n${ssid}\n\n비밀번호\n${password === '' ? '없음' : password}`,
    },
    { dialogTitle: '와이파이 정보 공유' },
  );
}
