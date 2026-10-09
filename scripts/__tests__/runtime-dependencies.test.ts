import { describe, expect, it } from 'vitest';
import { findBundledAdvisories } from '../check-runtime-dependencies.mjs';

const audit = {
  vulnerabilities: {
    uuid: { nodes: ['node_modules/uuid'], via: [{ url: 'https://github.com/advisories/GHSA-w5hq-g745-h8pq' }] },
    xcode: { nodes: ['node_modules/xcode'], via: ['uuid'] },
  },
};

describe('audit와 실제 번들 대조', () => {
  it('직접 취약점 패키지가 번들에 있으면 보고한다', () => {
    expect(findBundledAdvisories(audit, { sources: ['../../node_modules/uuid/dist/index.js'] })).toHaveLength(1);
  });

  it('동일 이름의 Expo 내부 유틸을 npm 패키지와 혼동하지 않는다', () => {
    expect(findBundledAdvisories(audit, { sources: ['/node_modules/expo-modules-core/src/uuid/index.ts'] })).toEqual([]);
  });

  it('상위 패키지만 포함됐다는 이유로 취약점 코드를 포함했다고 보고하지 않는다', () => {
    expect(findBundledAdvisories(audit, { sources: ['/node_modules/xcode/index.js'] })).toEqual([]);
  });

  it('입력 파일이 잘못됐으면 통과시키지 않는다', () => {
    expect(() => findBundledAdvisories(audit, { sources: [] })).toThrow();
  });
});
