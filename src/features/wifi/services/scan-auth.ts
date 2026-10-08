import { Platform } from 'react-native';
import { scanRequestContent, type ScanIdentity } from '../../../../shared/scan-contract';
import { ScanError } from '../lib/scan-error';

const projectNumber = process.env.EXPO_PUBLIC_PLAY_CLOUD_PROJECT_NUMBER;
let installation: Promise<string> | undefined;
let provider: Promise<void> | undefined;
const requests = new WeakMap<object, ScanIdentity>();

// 같은 사진의 통신 재시도에는 같은 요청 ID와 발급 시각을 사용한다.
export async function scanAuthorization(photo: object, image: string, apiUrl: string): Promise<{ identity: ScanIdentity; headers: Record<string, string> }> {
  try {
    // 네이티브 보호 모듈이 없는 기존 빌드에서도 QR 화면은 열리게 한다.
    const { CryptoDigestAlgorithm, digestStringAsync, randomUUID } = await import('expo-crypto');
    let identity = requests.get(photo);
    if (!identity) {
      identity = { installationId: await installationId(), requestId: randomUUID(), issuedAt: Date.now() };
      requests.set(photo, identity);
    }
    if (Date.now() - identity.issuedAt > 300000) throw new ScanError('request_expired');
    // 로컬 서버에만 개발 요청을 보내며 공개 주소에서는 검증을 생략하지 않는다.
    if (__DEV__ && ['localhost', '127.0.0.1', '[::1]'].includes(new URL(apiUrl).hostname)) return { identity, headers: {} };
    if (Platform.OS !== 'android' || !projectNumber || !/^\d+$/.test(projectNumber)) throw new ScanError('verification_unavailable');
    const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, scanRequestContent(identity, 'image/jpeg', image));
    const token = await integrityToken(hash);
    return { identity, headers: { 'X-Play-Integrity': token } };
  } catch (error) {
    if (error instanceof ScanError) throw error;
    throw new ScanError('verification_unavailable');
  }
}

// 개인 정보나 하드웨어 ID 대신 임의 식별자 하나만 기기에 보관한다.
async function installationId(): Promise<string> {
  if (!installation) installation = (async () => {
    const { randomUUID } = await import('expo-crypto');
    if (Platform.OS === 'web') return randomUUID();
    const store = await import('expo-secure-store');
    const saved = await store.getItemAsync('wifi-please-installation-v1');
    if (saved && /^[a-f0-9-]{36}$/.test(saved)) return saved;
    const id = randomUUID();
    await store.setItemAsync('wifi-please-installation-v1', id);
    return id;
  })().catch(error => { installation = undefined; throw error; });
  return installation;
}

// 검증 공급자 만료 때만 한 번 새로 준비하고 AI 요청은 자동 재시도하지 않는다.
async function integrityToken(hash: string): Promise<string> {
  const integrity = await import('@expo/app-integrity');
  async function prepare() {
    provider ??= integrity.prepareIntegrityTokenProviderAsync(projectNumber!).catch(error => { provider = undefined; throw error; });
    await provider;
  }
  await prepare();
  try { return await integrity.requestIntegrityCheckAsync(hash); }
  catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ERR_APP_INTEGRITY_PROVIDER_INVALID') throw error;
    provider = undefined;
    await prepare();
    return integrity.requestIntegrityCheckAsync(hash);
  }
}
