import { z } from 'zod';

export type IntegrityEnv = { PLAY_SERVICE_ACCOUNT_JSON?: string; PLAY_PACKAGE_NAME?: string; SCAN_MODE?: string };
const Account = z.object({ client_email: z.string().email(), private_key: z.string() });
const Verdict = z.object({ tokenPayloadExternal: z.object({
  requestDetails: z.object({ requestPackageName: z.string(), requestHash: z.string(), timestampMillis: z.string() }),
  appIntegrity: z.object({ appRecognitionVerdict: z.string(), packageName: z.string().optional() }),
  accountDetails: z.object({ appLicensingVerdict: z.string() }),
  deviceIntegrity: z.object({ deviceRecognitionVerdict: z.array(z.string()).optional() }),
}) });
let cachedAccess: { credential: string; token: string; expires: number } | undefined;
let pendingAccess: Promise<string> | undefined;

// 검증 거절과 검증 서버 장애를 분리해 사용자를 공격자로 단정하지 않는다.
export class IntegrityError extends Error {
  constructor(readonly reason: 'integrity_required' | 'integrity_failed' | 'verification_unavailable') { super(reason); }
}

// 개발용 우회는 서버 설정과 실제 루프백 주소가 모두 맞을 때만 허용한다.
export async function verifyIntegrity(request: Request, env: IntegrityEnv, hash: string): Promise<void> {
  if (env.SCAN_MODE === 'local' && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)) return;
  if (env.SCAN_MODE !== 'production' || !env.PLAY_SERVICE_ACCOUNT_JSON || !env.PLAY_PACKAGE_NAME) throw new IntegrityError('verification_unavailable');
  const token = request.headers.get('X-Play-Integrity');
  if (!token || token.length > 16000) throw new IntegrityError('integrity_required');
  try {
    const access = await accessToken(env.PLAY_SERVICE_ACCOUNT_JSON);
    const response = await fetch(`https://playintegrity.googleapis.com/v1/${encodeURIComponent(env.PLAY_PACKAGE_NAME)}:decodeIntegrityToken`, {
      method: 'POST', headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ integrity_token: token }), signal: AbortSignal.timeout(8000),
    });
    if (response.status === 400) throw new IntegrityError('integrity_failed');
    if (response.status === 401) cachedAccess = undefined;
    if (!response.ok) throw new IntegrityError('verification_unavailable');
    const parsed = Verdict.safeParse(await response.json());
    if (!parsed.success) throw new IntegrityError('integrity_failed');
    const { requestDetails, appIntegrity, accountDetails, deviceIntegrity } = parsed.data.tokenPayloadExternal;
    const age = Date.now() - Number(requestDetails.timestampMillis);
    if (!Number.isFinite(age) || age < -30000 || age > 300000 || requestDetails.requestHash !== hash ||
      requestDetails.requestPackageName !== env.PLAY_PACKAGE_NAME || appIntegrity.packageName !== env.PLAY_PACKAGE_NAME ||
      appIntegrity.appRecognitionVerdict !== 'PLAY_RECOGNIZED' || accountDetails.appLicensingVerdict !== 'LICENSED' ||
      !deviceIntegrity.deviceRecognitionVerdict?.includes('MEETS_DEVICE_INTEGRITY')) throw new IntegrityError('integrity_failed');
  } catch (error) {
    if (error instanceof IntegrityError) throw error;
    throw new IntegrityError('verification_unavailable');
  }
}

// Google 서비스 계정의 단기 액세스 토큰만 메모리에 캐시한다.
async function accessToken(credential: string): Promise<string> {
  if (cachedAccess?.credential === credential && cachedAccess.expires > Date.now() + 60000) return cachedAccess.token;
  if (!pendingAccess) pendingAccess = mintAccessToken(credential).finally(() => { pendingAccess = undefined; });
  return pendingAccess;
}

// 서버 비밀키로 OAuth JWT를 서명하며 클라이언트 입력으로 인증 주소를 바꾸지 않는다.
async function mintAccessToken(credential: string): Promise<string> {
  const account = Account.parse(JSON.parse(credential));
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => base64url(new TextEncoder().encode(JSON.stringify(value)));
  const content = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/playintegrity', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const pem = account.private_key.replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), character => character.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(content));
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${content}.${base64url(new Uint8Array(signature))}` }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new IntegrityError('verification_unavailable');
  const result = z.object({ access_token: z.string().min(1), expires_in: z.number().positive().max(3600) }).parse(await response.json());
  cachedAccess = { credential, token: result.access_token, expires: Date.now() + result.expires_in * 1000 };
  return result.access_token;
}

// Web Cryptoの署名をGoogleが受け取るURL安全なBase64に変換する。
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
