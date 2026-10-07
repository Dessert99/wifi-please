import { expect, it } from 'vitest';
import { createWifiQr } from '../wifi-qr';
import { parseWifiQr } from '../parse-wifi-qr';

it.each([
  { ssid: '카페 2층', password: ' cafe:abc;\\"! ', security: 'WPA', hidden: true },
  { ssid: '"Cafe"', password: '"password"', security: 'WPA', hidden: false },
  { ssid: '무료 와이파이', password: '', security: 'nopass', hidden: false },
  { ssid: '레거시', password: '1234567890', security: 'WEP', hidden: true },
  { ssid: '새 네트워크', password: 'abcdefgh', security: 'SAE', hidden: false },
])('QR로 공유해도 이름, 비밀번호, 보안 방식과 숨김 여부가 유지된다: $ssid', (wifi) => {
  expect(parseWifiQr(createWifiQr(wifi))).toEqual(wifi);
});
