// 와이파이 QR 코드 내용을 읽는다.
// 형식: WIFI:T:WPA;S:cafe_onda_5G;P:onda2024!;H:false;;
// 값 안의 \ ; , : " 는 앞에 \ 를 붙여 이스케이프한다.

import type { WifiCredentials } from '../types';

export function parseWifiQr(raw: string): WifiCredentials | null {
  const text = raw.trim();
  if (!/^WIFI:/i.test(text)) return null;

  // "S:cafe;" 를 { S: 'cafe' } 처럼 키와 값으로 모은다.
  const fields: Record<string, string> = {};
  let key = '';
  let value = '';
  let readingKey = true;
  let quoted = false;
  let lastWasUnescapedQuote = false;

  // "WIFI:" 다음 글자부터 한 글자씩 읽는다.
  for (let i = 5; i < text.length; i++) {
    let ch = text[i];
    // \ 다음 글자는 구분자가 아니라 값의 일부로 본다.
    const escaped = ch === '\\' && i + 1 < text.length;
    if (escaped) ch = text[++i];

    if (readingKey) {
      // 키를 읽는 중: ':' 를 만나면 값 읽기로 넘어간다.
      if (!escaped && ch === ':') readingKey = false;
      else if (!escaped && ch === ';') key = '';
      else key += ch;
    } else if (!escaped && ch === ';') {
      // 값을 읽는 중: ';' 를 만나면 한 필드가 끝난다.
      fields[key.toUpperCase()] = quoted && lastWasUnescapedQuote ? value.slice(1, -1) : value;
      key = '';
      value = '';
      readingKey = true;
      quoted = false;
      lastWasUnescapedQuote = false;
    } else {
      if (value.length === 0) quoted = ch === '"' && !escaped;
      lastWasUnescapedQuote = ch === '"' && !escaped;
      value += ch;
    }
  }
  // 마지막 ';' 가 빠진 QR도 읽을 수 있게 남은 값을 저장한다.
  if (!readingKey && key) fields[key.toUpperCase()] = quoted && lastWasUnescapedQuote ? value.slice(1, -1) : value;

  // 와이파이 이름이 없으면 연결할 수 없으니 실패로 본다.
  const ssid = fields.S ?? '';
  if (!ssid) return null;

  const password = fields.P ?? '';
  return {
    ssid,
    password,
    // 보안 방식이 빠져 있으면 비밀번호 유무로 판단한다.
    security: fields.T || (password ? 'WPA' : 'nopass'),
    hidden: fields.H?.toLowerCase() === 'true',
  };
}

const escapeField = (value: string) => value.replace(/[\\;,:\"]/g, '\\$&');

export function createWifiQr(wifi: WifiCredentials) {
  return `WIFI:T:${escapeField(wifi.security)};S:${escapeField(wifi.ssid)};P:${escapeField(wifi.password)};H:${wifi.hidden};;`;
}
