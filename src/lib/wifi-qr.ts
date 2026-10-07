import type { WifiCredentials } from './wifi';

const escapeField = (value: string) => value.replace(/[\\;,:\"]/g, '\\$&');

export function createWifiQr(wifi: WifiCredentials) {
  return `WIFI:T:${escapeField(wifi.security)};S:${escapeField(wifi.ssid)};P:${escapeField(wifi.password)};H:${wifi.hidden};;`;
}
