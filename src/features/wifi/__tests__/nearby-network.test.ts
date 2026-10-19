import { expect, it } from 'vitest';
import { matchNearbyNetwork, securityOf, type ScannedNetwork } from '../lib/nearby-network';

const wifi = { ssid: 'Cafe Onda', password: 'onda2024!', security: 'WPA', hidden: false };
const network = (ssid: string, capabilities = '[WPA2-PSK-CCMP][ESS]', level = -60): ScannedNetwork => ({ ssid, capabilities, level });

it('안내문 표기와 다른 실제 이름으로 고치고 대역별 이름 중 신호가 강한 쪽을 고른다', () => {
  const result = matchNearbyNetwork(wifi, [network('CAFE_ONDA_2.4G', undefined, -50), network('CAFE_ONDA_5G', undefined, -40), network('olleh_WiFi')]);
  expect(result).toEqual({ ...wifi, ssid: 'CAFE_ONDA_5G' });
});

it('원문과 똑같은 이름이 있으면 비슷한 다른 이름보다 우선한다', () => {
  expect(matchNearbyNetwork(wifi, [network('Cafe Onda_5G'), network('Cafe Onda')]).ssid).toBe('Cafe Onda');
});

it('한두 글자 잘못 읽은 이름을 고친다', () => {
  expect(matchNearbyNetwork({ ...wifi, ssid: 'STARBUCKS_0NE' }, [network('STARBUCKS_ONE')]).ssid).toBe('STARBUCKS_ONE');
});

it('서로 다른 네트워크가 똑같이 비슷하거나 비슷한 이름이 없으면 인식 값을 유지한다', () => {
  expect(matchNearbyNetwork({ ...wifi, ssid: 'U+Net' }, [network('U+Net1A2B'), network('U+NetC3D4')])).toEqual({ ...wifi, ssid: 'U+Net' });
  expect(matchNearbyNetwork(wifi, [network('KT_GiGA_1234'), network('iptime')])).toEqual(wifi);
  expect(matchNearbyNetwork(wifi, [])).toEqual(wifi);
});

it('WPA3 전용 네트워크는 SAE로, 혼합 모드는 WPA로 연결한다', () => {
  expect(matchNearbyNetwork(wifi, [network('CAFE_ONDA', '[RSN-SAE-CCMP][ESS]')]).security).toBe('SAE');
  expect(matchNearbyNetwork(wifi, [network('CAFE_ONDA', '[RSN-PSK+SAE-CCMP][ESS]')]).security).toBe('WPA');
});

it('비밀번호 유무와 맞지 않거나 판단할 수 없는 보안 방식은 기존 값을 유지한다', () => {
  expect(matchNearbyNetwork(wifi, [network('CAFE_ONDA', '[ESS]')]).security).toBe('WPA');
  expect(matchNearbyNetwork(wifi, [network('CAFE_ONDA', '[WPA2-EAP-CCMP][ESS]')]).security).toBe('WPA');
  expect(securityOf('[WEP][ESS]')).toBe('WEP');
  expect(securityOf('[ESS]')).toBe('nopass');
});
