import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import type { IntegrityEnv } from '../src/play-integrity';

let credential: string;
let publicKey: CryptoKey;
let env: IntegrityEnv;
let verify: typeof import('../src/play-integrity').verifyIntegrity;
const request = new Request('https://wifi-please.test/scan', { headers: { 'X-Play-Integrity': 'test-token' } });

// 일회성 테스트 키를 생성해 Google OAuth 서명까지 실제 암호 연산으로 확인한다.
beforeAll(async () => {
  const keys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  publicKey = keys.publicKey;
  const bytes = await crypto.subtle.exportKey('pkcs8', keys.privateKey);
  credential = JSON.stringify({ client_email: 'test@example.com', private_key: `-----BEGIN PRIVATE KEY-----\n${Buffer.from(bytes).toString('base64')}\n-----END PRIVATE KEY-----` });
});
beforeEach(async () => {
  vi.resetModules();
  verify = (await import('../src/play-integrity')).verifyIntegrity;
  env = { SCAN_MODE: 'production', PLAY_PACKAGE_NAME: 'com.wifiplease.app', PLAY_SERVICE_ACCOUNT_JSON: credential };
});
afterEach(() => vi.unstubAllGlobals());

// Google의 외부 응답만 대체하고 검증 조건은 실제 서버 코드에 맡긴다.
function google(overrides: Record<string, unknown> = {}) {
  const verdict = {
    requestDetails: { requestPackageName: env.PLAY_PACKAGE_NAME, requestHash: '해시', timestampMillis: String(Date.now()) },
    appIntegrity: { appRecognitionVerdict: 'PLAY_RECOGNIZED', packageName: env.PLAY_PACKAGE_NAME },
    accountDetails: { appLicensingVerdict: 'LICENSED' },
    deviceIntegrity: { deviceRecognitionVerdict: ['MEETS_DEVICE_INTEGRITY'] }, ...overrides,
  };
  const external = vi.fn<typeof fetch>().mockImplementation(async (url) => String(url).includes('oauth2') ? Response.json({ access_token: '단기 토큰', expires_in: 3600 }) : Response.json({ tokenPayloadExternal: verdict }));
  vi.stubGlobal('fetch', external);
  return external;
}

it('정상 앱·기기·라이선스·요청을 승인하고 올바른 서비스 계정 JWT를 만든다', async () => {
  const external = google();
  await expect(verify(request, env, '해시')).resolves.toBeUndefined();
  const jwt = (external.mock.calls[0][1]?.body as URLSearchParams).get('assertion')!;
  const [header, payload, signature] = jwt.split('.');
  expect(JSON.parse(Buffer.from(payload, 'base64url').toString())).toMatchObject({ scope: 'https://www.googleapis.com/auth/playintegrity', aud: 'https://oauth2.googleapis.com/token' });
  expect(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, Buffer.from(signature, 'base64url'), new TextEncoder().encode(`${header}.${payload}`))).toBe(true);
});

it.each([
  { requestDetails: { requestPackageName: 'com.wifiplease.app', requestHash: '바뀐 사진', timestampMillis: String(Date.now()) } },
  { requestDetails: { requestPackageName: 'com.wifiplease.app', requestHash: '해시', timestampMillis: '0' } },
  { requestDetails: { requestPackageName: '다른 앱', requestHash: '해시', timestampMillis: String(Date.now()) } },
  { appIntegrity: { appRecognitionVerdict: 'UNRECOGNIZED_VERSION' } },
  { accountDetails: { appLicensingVerdict: 'UNLICENSED' } },
  { deviceIntegrity: { deviceRecognitionVerdict: [] } },
])('위조·만료·재사용·미인증 판정은 거절한다: %j', async overrides => {
  google(overrides);
  await expect(verify(request, env, '해시')).rejects.toMatchObject({ reason: 'integrity_failed' });
});

it('Google 장애는 검증 실패와 구분하고 통과시키지 않는다', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('장애')));
  await expect(verify(request, env, '해시')).rejects.toMatchObject({ reason: 'verification_unavailable' });
});

it('설정이나 토큰이 빠진 공개 요청은 거절한다', async () => {
  await expect(verify(request, { ...env, PLAY_SERVICE_ACCOUNT_JSON: undefined }, '해시')).rejects.toMatchObject({ reason: 'verification_unavailable' });
  await expect(verify(new Request(request.url), env, '해시')).rejects.toMatchObject({ reason: 'integrity_required' });
});
