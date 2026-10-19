// 와이파이 안내문 사진을 프록시 서버(server/)로 보내 와이파이 이름과 비밀번호를 받는다.

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { deleteCachedPhoto } from './photo-cache';
import { scanAuthorization } from './scan-auth';
import { isScanBlockReason } from '../../../../shared/scan-contract';
import { ScanError } from '../lib/scan-error';
export { ScanError } from '../lib/scan-error';

const SCAN_API_URL = process.env.EXPO_PUBLIC_SCAN_API_URL;

// Claude가 원본 그대로 읽는 상한(긴 쪽 1568px, 약 115만 화소)에 맞춰 작은 글씨를 살리고 서버 측 재축소를 피한다.
const MAX_EDGE = 1568;
const MAX_PIXELS = 1_150_000;

export type Photo = { uri: string; width: number; height: number };

export type ScanResult = {
  ssid: string | null;
  // null: 못 찾음, '': 비밀번호 없는 네트워크
  password: string | null;
};

// 사진을 전송용으로 변환하고 서버 응답을 검증한 뒤 인식 결과만 반환한다.
export async function scanWifiPhoto(photo: Photo): Promise<ScanResult> {
  const image = await toResizedBase64(photo);

  if (!SCAN_API_URL) throw new ScanError('server');
  // 앱 확인이 멈춰도 촬영 화면을 무기한 잠그지 않는다.
  let verificationTimeout: ReturnType<typeof setTimeout> | undefined;
  const authorization = await Promise.race([
    scanAuthorization(photo, image, SCAN_API_URL),
    new Promise<never>((_resolve, reject) => { verificationTimeout = setTimeout(() => reject(new ScanError('verification_unavailable')), 20000); }),
  ]).finally(() => clearTimeout(verificationTimeout));
  // 서버의 앱 검증과 AI 대기 시간을 합쳐 응답 대기를 50초로 제한한다.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000);
  try {
    let response: Response;
    try {
      response = await fetch(`${SCAN_API_URL}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authorization.headers },
        body: JSON.stringify({ image, mediaType: 'image/jpeg', ...authorization.identity }),
        signal: controller.signal,
      });
    } catch { throw new ScanError('network'); }
    // 요청 제한과 서버 오류를 구분해 호출자에게 전달한다.
    if (!response.ok) {
      const failure: unknown = await response.json().catch(() => null);
      if (failure && typeof failure === 'object' && 'error' in failure && isScanBlockReason(failure.error)) {
        const retryAt = 'retryAt' in failure && typeof failure.retryAt === 'number' && Number.isFinite(failure.retryAt) && failure.retryAt > 0 && failure.retryAt < 8640000000000000 ? failure.retryAt : undefined;
        throw new ScanError(failure.error, retryAt);
      }
      throw new ScanError(response.status === 429 ? 'rate_limited' : 'server');
    }
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

// 긴 쪽과 전체 화소 상한을 함께 지키도록 줄일 크기를 계산한다.
export function resizedSize(width: number, height: number) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)));
  // 부동소수점 오차로 1px 작아지지 않도록 아주 작은 값을 더해 내린다.
  return { width: Math.floor(width * scale + 1e-6), height: Math.floor(height * scale + 1e-6) };
}

// 사진을 인식 상한 크기의 JPEG로 줄이고 base64 문자열로 바꾼다.
async function toResizedBase64({ uri, width, height }: Photo) {
  const context = ImageManipulator.manipulate(uri);
  const size = resizedSize(width, height);
  if (size.width < width) context.resize(size);
  try {
    const rendered = await context.renderAsync();
    try {
      const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.9, base64: true });
      try {
        if (!saved.base64) throw new ScanError('server');
        return saved.base64;
      } finally { deleteCachedPhoto(saved.uri); }
    } finally { rendered.release(); }
  } finally { context.release(); }
}
