import { describe, expect, it } from 'vitest';
import { parseWifiQr } from '../lib/wifi-qr';

describe('parseWifiQr', () => {
  it('기본 형식', () => {
    expect(parseWifiQr('WIFI:T:WPA;S:cafe_onda_5G;P:onda2024!;;')).toEqual({
      ssid: 'cafe_onda_5G',
      password: 'onda2024!',
      security: 'WPA',
      hidden: false,
    });
  });

  it('필드 순서가 달라도 읽음', () => {
    expect(parseWifiQr('WIFI:S:home;P:12345678;T:WPA;H:true;;')).toMatchObject({ ssid: 'home', hidden: true });
  });

  it('이스케이프된 특수문자', () => {
    expect(parseWifiQr(String.raw`WIFI:S:my\;cafe;T:WPA;P:pa\:ss\\word;;`)).toMatchObject({
      ssid: 'my;cafe',
      password: String.raw`pa:ss\word`,
    });
  });

  it('비밀번호 없는 네트워크', () => {
    expect(parseWifiQr('WIFI:T:nopass;S:free_wifi;;')).toEqual({
      ssid: 'free_wifi',
      password: '',
      security: 'nopass',
      hidden: false,
    });
  });

  it('보안 방식이 없으면 비밀번호 유무로 판단', () => {
    expect(parseWifiQr('WIFI:S:cafe;P:12345678;;')?.security).toBe('WPA');
  });

  it('소문자 접두어와 따옴표로 감싼 이름', () => {
    expect(parseWifiQr('wifi:S:"Onda Cafe";P:1234;;')?.ssid).toBe('Onda Cafe');
  });

  it('와이파이 QR이 아니면 null', () => {
    expect(parseWifiQr('https://example.com')).toBeNull();
    expect(parseWifiQr('WIFI:T:WPA;P:1234;;')).toBeNull();
  });
});
