import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { resizedSize, scanWifiPhoto, ScanError } from '../services/scan-photo';
import { scanAuthorization } from '../services/scan-auth';

vi.mock('../services/photo-cache', () => ({ deleteCachedPhoto: vi.fn() }));
vi.mock('../services/scan-auth', () => ({ scanAuthorization: vi.fn(async () => ({ identity: { installationId: '설치', requestId: '요청', issuedAt: 1 }, headers: { 'X-Play-Integrity': '검증 토큰' } })) }));

// 이미지 처리 SDK를 대체해 서버 요청과 응답 처리 흐름에 집중한다.
vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: () => ({ resize: vi.fn(), release: vi.fn(), renderAsync: async () => ({ release: vi.fn(), saveAsync: async () => ({ uri: 'file:///cache/resized.jpg', base64: '테스트사진' }) }) }) },
}));

// ESM 모듈이 주소를 읽기 전에 테스트 환경변수를 설정한다.
vi.hoisted(() => { vi.stubEnv('EXPO_PUBLIC_SCAN_API_URL', 'https://wifi-please.test'); });
const photo = { uri: 'file:///test.jpg', width: 2000, height: 1000 };
// 각 테스트의 fetch 대체와 가상 타이머를 원래 상태로 돌린다.
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
// 인식 서버 주소에 사용한 테스트 환경변수를 복원한다.
afterAll(() => { vi.unstubAllEnvs(); });

it('빈 비밀번호와 공백, 대소문자를 그대로 돌려준다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ssid: ' Cafe ', password: '' }) }));
  expect(await scanWifiPhoto(photo)).toEqual({ ssid: ' Cafe ', password: '' });
});
it('잘못된 서버 응답을 연결 정보로 사용하지 않는다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ssid: 123, password: 'abc' }) }));
  await expect(scanWifiPhoto(photo)).rejects.toEqual(new ScanError('server'));
});
it.each([[429, 'rate_limited'], [503, 'server']])('HTTP %s를 구별한다', async (status, reason) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({}) }));
  await expect(scanWifiPhoto(photo)).rejects.toMatchObject({ reason });
});
it('인터넷 연결 실패를 구별한다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('오프라인')));
  await expect(scanWifiPhoto(photo)).rejects.toMatchObject({ reason: 'network' });
});
it('50초가 지나면 요청을 중단한다', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('시간 초과')));
  })));
  const result = scanWifiPhoto(photo);
  const expectation = expect(result).rejects.toMatchObject({ reason: 'network' });
  await vi.advanceTimersByTimeAsync(50000);
  await expectation;
});

it('서버의 일일 제한과 초기화 시각을 안내 계층에 전달한다', async () => {
  const retryAt = Date.UTC(2026, 9, 8, 15);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({ error: 'daily_limit', retryAt }) }));
  await expect(scanWifiPhoto(photo)).rejects.toMatchObject({ reason: 'daily_limit', retryAt });
  expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: expect.objectContaining({ 'X-Play-Integrity': '검증 토큰' }) }));
});

it('알 수 없는 오류 문구와 유효하지 않은 초기화 시각은 신뢰하지 않는다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'integrity_failed', retryAt: 1e30 }) }));
  await expect(scanWifiPhoto(photo)).rejects.toMatchObject({ reason: 'integrity_failed', retryAt: undefined });
});

it('앱 검증이 멈추면 20초 뒤 안내하고 사진을 서버로 보내지 않는다', async () => {
  vi.useFakeTimers();
  vi.mocked(scanAuthorization).mockImplementationOnce(() => new Promise(() => {}));
  vi.stubGlobal('fetch', vi.fn());
  const result = expect(scanWifiPhoto({ ...photo })).rejects.toMatchObject({ reason: 'verification_unavailable' });
  await vi.advanceTimersByTimeAsync(20000);
  await result;
  expect(fetch).not.toHaveBeenCalled();
});

it('사진을 긴 쪽 1568px과 약 115만 화소 안으로 줄이고 작은 사진은 키우지 않는다', () => {
  const photo = resizedSize(4000, 3000);
  expect(photo.width * photo.height).toBeLessThanOrEqual(1_150_000);
  expect(photo.width).toBeGreaterThan(1200);
  expect(resizedSize(3000, 1000)).toEqual({ width: 1568, height: 522 });
  expect(resizedSize(800, 600)).toEqual({ width: 800, height: 600 });
});
