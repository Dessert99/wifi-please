// 사진에서 읽은 와이파이 이름을 주변에서 실제로 잡히는 네트워크 이름과 맞춘다.
// 안내문 표기("Cafe Onda")와 실제 이름("CAFE_ONDA_5G")이 다르면 연결 창에서 저장만 되고 연결되지 않기 때문이다.

import type { WifiCredentials } from '../types';

export type ScannedNetwork = { ssid: string; capabilities: string; level: number };

// 대소문자, 공백, 구분 기호, 전각 문자 차이를 없앤 비교용 이름을 만든다.
const normalize = (ssid: string) => ssid.normalize('NFKC').toLowerCase().replace(/[\s_\-.·]/g, '');
// 같은 공유기의 주파수별 이름("_5G", "-2.4GHz")을 하나로 묶기 위해 끝의 대역 표기를 뗀다.
const base = (name: string) => name.replace(/(2\.?4|2|5)g(hz)?$/, '') || name;

// 두 이름 사이의 편집 거리를 계산한다.
function distance(a: string, b: string) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

// 검색 결과의 보안 표기를 연결 창이 쓰는 보안 방식으로 바꾼다. 판단할 수 없으면 null이다.
export function securityOf(capabilities: string): string | null {
  const caps = capabilities.toUpperCase();
  if (caps.includes('EAP') || caps.includes('OWE')) return null;
  // WPA2/WPA3 혼합 모드는 WPA2 방식으로 접속할 수 있다.
  if (caps.includes('PSK')) return 'WPA';
  if (caps.includes('SAE')) return 'SAE';
  if (caps.includes('WEP')) return 'WEP';
  return 'nopass';
}

// 인식 결과와 같은 네트워크로 볼 수 있는 주변 네트워크를 고르고, 이름과 보안 방식을 실제 값으로 고친다.
export function matchNearbyNetwork(wifi: WifiCredentials, networks: ScannedNetwork[]): WifiCredentials {
  const target = normalize(wifi.ssid);
  if (!target) return wifi;
  const scored = networks.flatMap(network => {
    const name = normalize(network.ssid);
    if (!name) return [];
    const gap = distance(base(target), base(name));
    // 한쪽 이름이 다른 쪽을 포함하면(예: "onda"와 "cafeonda") 작은 차이로 본다.
    const contains = Math.min(target.length, name.length) >= 4 && (name.includes(target) || target.includes(name));
    const limit = Math.max(1, Math.floor(base(target).length / 4));
    if (network.ssid !== wifi.ssid && name !== target && gap > limit && !contains) return [];
    // 원문 일치, 비교용 이름 일치, 대역 표기만 다름, 오타·포함 순서로 우선한다.
    const rank = network.ssid === wifi.ssid ? 0 : name === target ? 1 : gap === 0 ? 2 : 3 + (contains ? 0 : gap);
    return [{ network, rank, group: base(name) }];
  });
  if (scored.length === 0) return wifi;
  const best = Math.min(...scored.map(item => item.rank));
  const top = scored.filter(item => item.rank === best);
  // 서로 다른 네트워크가 똑같이 그럴듯하면 잘못 고치지 않도록 인식한 값을 그대로 쓴다.
  if (new Set(top.map(item => item.group)).size > 1) return wifi;
  // 같은 공유기의 대역별 이름 중에서는 신호가 가장 강한 쪽을 고른다.
  const chosen = top.reduce((a, b) => (b.network.level > a.network.level ? b : a)).network;
  const security = securityOf(chosen.capabilities);
  return {
    ...wifi,
    ssid: chosen.ssid,
    // 비밀번호를 읽었는데 개방형으로 잡히는 경우처럼 앞뒤가 맞지 않으면 기존 판단을 유지한다.
    security: security && (security === 'nopass') === !wifi.password ? security : wifi.security,
  };
}
