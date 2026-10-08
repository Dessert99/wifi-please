import { expect, it } from 'vitest';
import { redirectSystemPath } from '../app/+native-intent';

it.each([true, false])('앱 시작 여부 %s와 무관하게 외부 쿼리를 라우터에 넘기지 않는다', initial => {
  expect(redirectSystemPath({ path: 'wifiplease://privacy?password=example', initial })).toBe('/privacy');
  expect(redirectSystemPath({ path: '/terms?value=%C0%AF%FF', initial })).toBe('/terms');
});

it('깨진 인코딩·너무 긴 링크·알 수 없는 화면은 안전하게 처음으로 보낸다', () => {
  for (const path of ['/unknown', '/%C0%AF%FF', '/share?input=' + '%FF'.repeat(10000)]) {
    expect(redirectSystemPath({ path, initial: true })).toBe('/');
  }
});

it('기존 화면의 정상 링크는 유지한다', () => {
  for (const path of ['/', '/share', '/qr', '/password', '/privacy', '/terms']) {
    expect(redirectSystemPath({ path, initial: false })).toBe(path);
  }
});
