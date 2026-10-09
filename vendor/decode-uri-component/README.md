# URL 디코더 호환 사본

[공식 decode-uri-component v0.5.0](https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.0)을 기반으로 `export default`를 `module.exports`로 바꿨다. 설명 주석을 한국어로 옮겼으며 원본 MIT 라이선스를 포함한다. 재귀 디코딩의 서비스 거부 취약점 [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr)이 수정된 버전이다.

추가 회귀 테스트에서 30만 자의 비정상 입력은 원본 0.5.0의 동적 정규식 크기 제한에 걸렸다. 최종 치환 한 줄을 `split(key).join(value)`로 바꿔 큰 정규식 생성과 `$&` 등 치환 문자열의 특수 해석을 피했다. UTF-8 해석 알고리즘은 원본과 동일하다.

Expo Router 57의 query-string 7은 CommonJS 함수 내보내기를 요구하므로 ESM 전용 공식 패키지를 그대로 override할 수 없다. 루트 package.json의 로컬 override로 앱과 Node 빌드에서 같은 수정본을 사용한다. 설치 후 node_modules를 변조하는 스크립트는 사용하지 않는다.

원본 index.js SHA-256: `9401353df38f8010ad7035fe8d666bce6a4902bc1cff809afc4ab23fa2e0bdaa`

Expo Router가 공식 수정 버전을 직접 지원하면 이 폴더와 override를 함께 제거한다. 변경 시 정상·비정상 URL과 대용량 입력에 대한 Vitest 및 Android Metro 번들을 다시 검증한다.
