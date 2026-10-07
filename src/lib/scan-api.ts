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

export class ScanError extends Error {
  constructor(readonly reason: 'network' | 'rate_limited' | 'server' | 'unreadable') {
    super(`scan failed: ${reason}`);
  }
}

export async function scanWifiPhoto(photo: Photo): Promise<ScanResult> {
  const image = await toResizedBase64(photo);

  if (!SCAN_API_URL) throw new ScanError('server');
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
    if (response.status === 429) throw new ScanError('rate_limited');
    if (!response.ok) throw new ScanError('server');
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
