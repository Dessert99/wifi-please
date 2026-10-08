import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createHash, randomUUID } from 'node:crypto';
import { scanRequestContent } from '../../../../shared/scan-contract';

const native = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), prepare: vi.fn(), token: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { OS: 'android' } }));
vi.mock('expo-secure-store', () => ({ getItemAsync: native.get, setItemAsync: native.set }));
vi.mock('@expo/app-integrity', () => ({ prepareIntegrityTokenProviderAsync: native.prepare, requestIntegrityCheckAsync: native.token }));
vi.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'sha256' }, randomUUID: () => randomUUID(), digestStringAsync: async (_algorithm: string, content: string) => createHash('sha256').update(content).digest('hex') }));

let authorize: typeof import('../services/scan-auth').scanAuthorization;
beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal('__DEV__', true);
  vi.stubEnv('EXPO_PUBLIC_PLAY_CLOUD_PROJECT_NUMBER', '123456789');
  native.get.mockResolvedValue(null); native.set.mockResolvedValue(undefined);
  native.prepare.mockResolvedValue(undefined); native.token.mockResolvedValue('test-token');
  authorize = (await import('../services/scan-auth')).scanAuthorization;
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('기존 설치 ID를 유지하고 같은 사진 재시도는 같은 요청 ID로 보낸다', async () => {
  const saved = randomUUID(); native.get.mockResolvedValue(saved);
  const photo = {};
  const first = await authorize(photo, '사진', 'https://wifi-please.test');
  const retry = await authorize(photo, '사진', 'https://wifi-please.test');
  const next = await authorize({}, '다음 사진', 'https://wifi-please.test');
  expect(first.identity.installationId).toBe(saved);
  expect(retry.identity).toEqual(first.identity);
  expect(next.identity.requestId).not.toBe(first.identity.requestId);
  expect(native.set).not.toHaveBeenCalled();
  expect(native.prepare).toHaveBeenCalledTimes(1);
  expect(native.token).toHaveBeenCalledWith(createHash('sha256').update(scanRequestContent(first.identity, 'image/jpeg', '사진')).digest('hex'));
});

it('새 설치에는 식별자 하나만 저장하고 사진이나 비밀번호는 저장하지 않는다', async () => {
  const first = await authorize({}, '사진', 'https://wifi-please.test');
  expect(native.set).toHaveBeenCalledExactlyOnceWith('wifi-please-installation-v1', first.identity.installationId);
});

it('토큰 공급자 만료는 한 번 복구하되 다른 검증 오류는 우회하지 않는다', async () => {
  native.token.mockRejectedValueOnce({ code: 'ERR_APP_INTEGRITY_PROVIDER_INVALID' });
  await expect(authorize({}, '사진', 'https://wifi-please.test')).resolves.toHaveProperty('headers.X-Play-Integrity', 'test-token');
  expect(native.prepare).toHaveBeenCalledTimes(2);
  native.token.mockRejectedValueOnce(new Error('검증 장애'));
  await expect(authorize({}, '사진', 'https://wifi-please.test')).rejects.toMatchObject({ reason: 'verification_unavailable' });
});

it('개발 앱이어도 공개 서버 요청에서는 앱 검증을 실행한다', async () => {
  await authorize({}, '사진', 'http://localhost:8787');
  expect(native.token).not.toHaveBeenCalled();
  await authorize({}, '사진', 'https://wifi-please.test');
  expect(native.token).toHaveBeenCalledOnce();
});

it('운영 앱은 루프백 주소에서도 검증을 생략하지 않는다', async () => {
  vi.stubGlobal('__DEV__', false);
  await authorize({}, '사진', 'http://localhost:8787');
  expect(native.token).toHaveBeenCalledOnce();
});
