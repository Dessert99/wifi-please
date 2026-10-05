Expo/React Native 모바일 앱이다. 모바일 우선 패턴, 성능, 크로스플랫폼 호환성을 우선한다.

## Expo는 바뀌었다. 학습 데이터를 믿지 말 것

Expo는 SDK 버전마다 호환되지 않는 변경을 낸다. 기억하는 API는 이름이 바뀌었거나, 위치가 옮겨졌거나, 삭제되었을 가능성이 높다. Expo, EAS, React Native API를 다루는 코드를 작성하기 전에:

1. `package.json`에서 `expo` 패키지의 메이저 버전을 확인한다.
2. 해당 버전의 문서를 가져온다: `https://docs.expo.dev/versions/v<major>.0.0/`
3. 그 밖의 내용은 https://docs.expo.dev/llms.txt 를 가져온다. 전체 Expo 문서 목록과 LLM이 자주 틀리는 내용의 정정이 들어 있다. 여기서 필요한 페이지 링크를 따라가고, 절대 기억에 의존해 답하지 않는다.

## 명령어

```bash
npx expo install <package>  # npm/yarn/pnpm/bun add 대신 항상 이것을 사용. SDK와 호환되는 버전으로 설치됨
npx expo start              # 개발 서버 실행
npx expo lint               # lint
npx tsc --noEmit            # 타입 검사
npx expo-doctor             # 의존성과 설정 문제 진단
npx expo install --fix      # 호환되지 않는 패키지 버전 수정
```

작업 완료를 알리기 전에 lint와 타입 검사를 실행한다.

## 화면 이동과 라우팅

- 모든 화면 이동에 **Expo Router**를 사용한다. 라우트는 `src/app/`에 둔다. 이 폴더의 파일 하나하나가 화면이고, `_layout.tsx` 파일이 내비게이터를 정의한다. 라우트가 아닌 코드(컴포넌트, 훅, 유틸)는 `src/app/` 밖에 둔다.
- `Link`, `router`, `useLocalSearchParams`는 `expo-router`에서 import한다.
- 문서: https://docs.expo.dev/router/introduction.md

## EAS로 빌드하기

EAS를 사용하면 앱 빌드, 서명, 스토어 제출을 클라우드에서 할 수 있고(`eas build`, `eas submit`), OTA 업데이트도 배포할 수 있다(`eas update`). 로컬에 Xcode나 Android Studio가 없어도 된다. EAS CLI는 `npx eas-cli@latest <command>`로 실행하고, 문서 예제의 `eas`를 이것으로 바꿔서 사용한다.
문서: https://docs.expo.dev/eas/index.md

## 규칙

- `ios/`, `android/` 폴더가 없다면 자동 생성되는 폴더다(Continuous Native Generation). 직접 만들거나 수정하지 않는다. 네이티브 동작은 `app.json`과 config plugin으로 설정한다.
- Expo Go는 사용하지 않는다. 항상 development build를 사용한다: 로컬에서는 `npx expo run:android`, 클라우드에서는 `npx eas-cli@latest build --profile development`.
- 서드파티 라이브러리보다 Expo 권장 모듈을 우선하고, 의존성을 추가하기 전에 사용 가능한 skill을 확인한다. 문서: https://docs.expo.dev/versions/latest/index.md
