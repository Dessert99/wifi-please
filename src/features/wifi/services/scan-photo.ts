// 와이파이 안내문 사진을 프록시 서버(server/)로 보내 와이파이 이름과 비밀번호를 받는다.

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const SCAN_API_URL = process.env.EXPO_PUBLIC_SCAN_API_URL;

// 긴 쪽 1024px이면 안내문 글자를 읽기에 충분하고, 전송량과 AI 비용이 줄어든다.
const MAX_EDGE = 1024;

export type Photo = { uri: string; width: number; height: number };

export type ScanResult = {
  ssid: string | null;
  // null: 못 찾음, '': 비밀번호 없는 네트워크
  password: string | null;
};

// 화면에서 복구 방법을 선택할 수 있도록 인식 실패 원인을 구분한다.
export class ScanError extends Error {
  constructor(readonly reason: 'network' | 'rate_limited' | 'server' | 'unreadable') {
    super(`scan failed: ${reason}`);
  }
}

// 사진을 전송용으로 변환하고 서버 응답을 검증한 뒤 인식 결과만 반환한다.
export async function scanWifiPhoto(photo: Photo): Promise<ScanResult> {
  const image = await toResizedBase64(photo);

  if (!SCAN_API_URL) throw new ScanError('server');
  // 응답 대기가 30초를 넘으면 요청을 중단한다.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    let response: Response;
    try {
      response = await fetch(`${SCAN_API_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mediaType: 'image/jpeg' }),
        signal: controller.signal,
      });
    } catch { throw new ScanError('network'); }
    // 요청 제한과 서버 오류를 구분해 호출자에게 전달한다.
    if (response.status === 429) throw new ScanError('rate_limited');
    if (!response.ok) throw new ScanError('server');
    // 외부 응답의 필드와 타입을 검사해 잘못된 값을 연결 정보로 사용하지 않는다.
    const result: unknown = await response.json();
    if (!result || typeof result !== 'object' ||
      !('ssid' in result) || !('password' in result) ||
      (result.ssid !== null && typeof result.ssid !== 'string') ||
      (result.password !== null && typeof result.password !== 'string')) {
      throw new ScanError('server');
    }
    return { ssid: result.ssid, password: result.password };
  } finally { clearTimeout(timeout); }
}

// 사진을 긴 쪽 1024px JPEG로 줄이고 base64 문자열로 바꾼다.
async function toResizedBase64({ uri, width, height }: Photo) {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) {
    context.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new ScanError('server');
  return saved.base64;
}
