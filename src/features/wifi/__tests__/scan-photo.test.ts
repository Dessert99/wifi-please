import { afterAll, afterEach, expect, it, vi } from 'vitest';
import { scanWifiPhoto, ScanError } from '../services/scan-photo';

// 이미지 처리 SDK를 대체해 서버 요청과 응답 처리 흐름에 집중한다.
vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: () => ({ resize: vi.fn(), renderAsync: async () => ({ saveAsync: async () => ({ base64: '테스트사진' }) }) }) },
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
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status }));
  await expect(scanWifiPhoto(photo)).rejects.toMatchObject({ reason });
});
it('인터넷 연결 실패를 구별한다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('오프라인')));
  await expect(scanWifiPhoto(photo)).rejects.toMatchObject({ reason: 'network' });
});
it('30초가 지나면 요청을 중단한다', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('시간 초과')));
  })));
  const result = scanWifiPhoto(photo);
  const expectation = expect(result).rejects.toMatchObject({ reason: 'network' });
  await vi.advanceTimersByTimeAsync(30000);
  await expectation;
});
