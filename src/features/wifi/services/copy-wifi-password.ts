import * as Clipboard from 'expo-clipboard';

// 원문을 그대로 복사하고, 플랫폼의 실패 반환값을 오류로 통일한다.
export async function copyWifiPassword(password: string): Promise<void> {
  if (!await Clipboard.setStringAsync(password)) {
    throw new Error('비밀번호를 복사하지 못했어요.');
  }
}
