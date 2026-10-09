import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const query = require('query-string');
const decode = require('decode-uri-component');
const { getStateFromPath } = require('expo-router/build/react-navigation/core/getStateFromPath');
const { getPathFromState } = require('expo-router/build/react-navigation/core/getPathFromState');

describe('Expo Router URL 디코더 보안 수정', () => {
  it('실제 query-string 소비자가 CommonJS 수정본을 사용한다', () => {
    const consumer = createRequire(require.resolve('query-string'));
    expect(consumer('decode-uri-component')).toBe(decode);
    expect(require.resolve('decode-uri-component')).toContain('vendor/decode-uri-component/index.js');
    expect(query.parse('name=%EC%B9%B4%ED%8E%98+WiFi&empty=&tag=a&tag=b')).toEqual({
      name: '카페 WiFi', empty: '', tag: ['a', 'b'],
    });
  });

  it.each([
    ['%EC%B9%B4%ED%8E%98', '카페'],
    ['%F0%9F%93%B6', '📶'],
    ['%FE%FF', '��'],
    ['%C2', '�'],
    ['%E0%A4%A', '%E0%A4%A'],
    ['%41%FF%42', 'A%FFB'],
    ['%ED%A0%80', '%ED%A0%80'],
    ['%G1%', '%G1%'],
    ['%FF%24%26', '%FF$&'],
  ])('비정상 UTF-8에서도 정상 구간을 보존한다: %s', (input, expected) => {
    expect(decode(input)).toBe(expected);
  });

  it('실제 Router의 화면 해석과 기존 쿼리 직렬화를 보존한다', () => {
    const config = { screens: { privacy: 'privacy' } };
    const state = getStateFromPath('/privacy?name=%EC%B9%B4%ED%8E%98&tag=a&tag=b', config);
    expect(state.routes[0].name).toBe('privacy');
    expect(state.routes[0].params).toEqual({ name: '카페', tag: ['a', 'b'] });
    expect(getPathFromState(state, config)).toBe('/privacy?name=%EC%B9%B4%ED%8E%98&tag=a%2Cb');
  });

  it('대량의 잘못된 인코딩을 제한시간 내 처리한다', () => {
    // 취약한 재귀 구현이 되돌아와도 테스트 프로세스 전체가 멈추지 않게 격리한다.
    const output = execFileSync(process.execPath, ['-e', `
      const query = require('query-string');
      const input = '%FF'.repeat(100000) + '%41';
      const value = query.parse('q=' + input).q;
      if (value !== '%FF'.repeat(100000) + 'A') process.exit(1);
      process.stdout.write('통과');
    `], { timeout: 5000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(output).toBe('통과');
  });
});
