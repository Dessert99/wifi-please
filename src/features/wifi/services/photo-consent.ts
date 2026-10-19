import * as SecureStore from 'expo-secure-store';
import privacy from '../../../../shared/privacy.json';

const key = 'wifi-please-photo-consent-v1';

// 동의 화면의 고지 문구가 바뀌면 기존 동의를 무효로 보도록 문구의 지문을 저장한다.
function disclosureVersion() {
  let hash = 5381;
  for (const ch of privacy.disclosure) hash = ((hash << 5) + hash + ch.codePointAt(0)!) | 0;
  return (hash >>> 0).toString(36);
}

// 이 설치에서 현재 고지 문구에 동의한 적이 있는지 확인하고, 읽기 실패는 미동의로 본다.
export async function hasPhotoConsent() {
  try { return (await SecureStore.getItemAsync(key)) === disclosureVersion(); }
  catch { return false; }
}

// 동의를 기기에 남기며, 저장에 실패해도 이번 실행 동안의 동의는 호출자가 유지한다.
export async function savePhotoConsent() {
  try { await SecureStore.setItemAsync(key, disclosureVersion()); }
  catch { /* 다음 실행에서 다시 묻는다. */ }
}
