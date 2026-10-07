Expo/React Native 모바일 앱이다. 모바일 우선 패턴, 성능, 크로스플랫폼 호환성을 우선한다.

## 프로젝트 결정 사항

Snapfi: 식당이나 카페의 와이파이 안내문을 찍으면 바로 연결해 주는 앱. 아래는 사용자와 정한 결정이며, 바꾸기 전에 사용자에게 확인한다.

- **앱 화면 없이 바로 시스템 와이파이 창**: 촬영이나 QR 인식이 끝나면 앱 안의 확인/수정 화면을 거치지 않고 바로 시스템 와이파이 연결 창을 띄운다. 앱 확인 화면은 사용자 요청으로 삭제했으니 다시 만들지 않는다.
- **사진 인식은 AI로**: 온디바이스 OCR(ML Kit)과 규칙 기반 파싱은 쓰지 않는다. 사진은 긴 쪽 1024px JPEG로 줄여 프록시 서버로 보내고, 서버가 Claude Haiku 4.5(`claude-haiku-4-5`)로 와이파이 이름과 비밀번호를 뽑는다. 규칙 기반 파서는 정확도 문제로 일부러 지웠다.
- **QR 코드는 앱에서 직접**: 와이파이 QR(`WIFI:S:...;P:...;;`)은 서버를 거치지 않고 `src/lib/parse-wifi-qr.ts`로 읽는다.
- **공유는 기본 Share API**: React Native의 `Share.share()`로 와이파이 이름과 비밀번호를 텍스트로 공유한다. 공유 버튼은 하나로 두고, 사용자가 시스템 공유 창에서 카카오톡 등 앱을 선택한다. 카카오 SDK나 자체 대화방 선택 화면은 만들지 않는다. 시스템 연결 창을 닫은 뒤 공유 화면을 연다. QR 확대, 비밀번호 확대 및 복사를 제공한다. 사용자가 전체 화면 시안을 승인했다. 와이파이 정보는 앱 메모리에만 보관하며 라우트 파라미터나 저장소에 기록하지 않는다.
- **프록시 서버는 Cloudflare Workers**: `server/` 폴더. API 키는 Cloudflare secret(`ANTHROPIC_API_KEY`)에만 있고 앱에는 절대 넣지 않는다. IP당 1분 10회 요청 제한이 있다. 배포 주소는 `.env`의 `EXPO_PUBLIC_SCAN_API_URL`. Vercel은 무료 요금제가 비상업 용도만 허용해서 쓰지 않기로 했다.
- **Android 먼저**: Android 11 이상을 우선 지원하고 iOS는 나중에 한다. 시스템 와이파이 창은 `Settings.ACTION_WIFI_ADD_NETWORKS`(Android 11+)를 쓴다. `src/lib/wifi.ts`의 `openSystemWifiDialog()`는 Kotlin 네이티브 모듈(`modules/wifi-manager/`)을 호출한다. 시스템 창의 저장/취소 결과를 기다리며 실제 연결 성공으로 표시하지 않는다. 네이티브 코드는 실기기 검증이 필요하다.
- **디자인**: 포인트 색 블루 `#1A73E8`, 밝은 바탕 `#F5F6F8`. 값은 `src/constants/theme.ts`에 있다. 앱 이름은 Snapfi.
- **로고**: "인식 틀 모서리 + 와이파이 기호, 파란 바탕에 흰 기호"로 골랐지만 아직 앱 아이콘에 적용하지 않았다. 지금 `assets/`의 아이콘은 Expo 기본값이다.

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
npm test                   # Vitest 전체 테스트
npm run test:watch         # Vitest 변경 감지 모드
npx expo-doctor             # 의존성과 설정 문제 진단
npx expo install --fix      # 호환되지 않는 패키지 버전 수정
```

테스트 도구는 Vitest를 사용한다. 설정은 `vitest.config.mts`에 두고, 테스트 파일은 `*.test.ts` 또는 `*.test.tsx` 형식으로 작성한다.

작업 완료를 알리기 전에 lint와 타입 검사를 실행한다.

## 화면 이동과 라우팅

- 모든 화면 이동에 **Expo Router**를 사용한다. 라우트는 `src/app/`에 둔다. 이 폴더의 파일 하나하나가 화면이고, `_layout.tsx` 파일이 내비게이터를 정의한다. 라우트가 아닌 코드(컴포넌트, 훅, 유틸)는 `src/app/` 밖에 둔다.
- `Link`, `router`, `useLocalSearchParams`는 `expo-router`에서 import한다.
- 문서: https://docs.expo.dev/router/introduction.md

## 파일 구조와 분리 원칙

아래 구조를 기준으로 새 코드를 배치하고 기존 코드를 수정한다. 와이파이 전용 코드를 최상위 `src/lib/`나 공통 `src/components/`에 추가하지 않는다.

```text
src/
  app/                           화면 구성과 Expo Router 라우팅
    _layout.tsx
    index.tsx
    share.tsx
    qr.tsx
    password.tsx
  components/                    기능과 무관한 앱 공통 UI
    brand-mark.tsx
    ui/
      button.tsx
      dialog.tsx
      icon.tsx
      screen.tsx
      toast.tsx
  constants/
    theme.ts                     공통 색상과 글꼴 스타일
  features/wifi/
    types.ts                     와이파이 공통 타입
    session.tsx                  메모리 세션
    use-capture.ts               촬영, 인식, 연결 순서와 중복 실행 제어
    use-camera-lifecycle.ts      카메라 권한, 화면 포커스, 앱 활성 상태
    use-share-actions.ts         공유, 복사, 재연결 상태와 동작
    components/
      camera-permission.tsx      권한 안내
      scan-frame.tsx
      shutter-button.tsx
      wifi-qr.tsx
      share-feedback.tsx         공유 오류와 복사 토스트 표시
    lib/
      wifi-qr.ts                 QR 해석과 생성
    services/
      scan-photo.ts              사진 처리와 서버 요청
      connect-wifi.ts            시스템 연결 창 호출
      share-wifi.ts              시스템 Share 호출
    __tests__/                   기능별 Vitest 테스트
modules/wifi-manager/             Expo 로컬 Kotlin 모듈
server/                          독립 Cloudflare Workers 서버
```

- `app/`은 화면 구성과 라우팅을 담당한다. 짧은 화면을 다른 폴더로 옮겨 재수출하는 파일을 만들지 않는다.
- 공통 UI는 `features/`에 의존하지 않는다. 와이파이 타입이나 동작이 필요한 컴포넌트는 `features/wifi/components/`에 둔다.
- 훅은 상태와 동작을 반환한다. JSX, 토스트 배치, 화면 스타일을 반환하지 않는다. 훅 파일은 `use-*.ts`, 렌더링 컴포넌트는 `.tsx`로 작성한다.
- 촬영부터 인식과 시스템 연결 창까지의 순서 및 실행 잠금은 `use-capture.ts`가 소유한다. 작업별로 잠금을 나눠 중복 실행을 허용하지 않는다.
- 카메라 권한과 앱 활성 상태는 `use-camera-lifecycle.ts`가 담당한다. 촬영·인식·연결 결과와 오류 안내는 촬영 흐름에서 처리한다.
- `types.ts`와 `lib/`는 React, Expo, React Native 런타임과 네이티브 모듈에 의존하지 않는다. 동일한 와이파이 정보를 별도 타입으로 중복 정의하지 않는다.
- `services/`는 HTTP 또는 시스템 API와의 통신을 담당한다. 화면 이동이나 JSX를 포함하지 않는다. 비밀번호를 저장하거나 로그에 출력하지 않는다.
- 스타일은 사용하는 컴포넌트 파일에 둔다. 공통 색상과 글꼴 스타일만 `theme.ts`에서 공유하며, 여러 컴포넌트의 내부 스타일을 하나의 객체로 내보내지 않는다.
- 함수마다 파일이나 훅을 만들지 않는다. 함께 바뀌는 로직은 함께 두며, QR 해석과 생성은 같은 파일에 둔다.
- 테스트는 기능의 `__tests__/`에 두고 `.test.ts` 또는 `.test.tsx`로 작성한다. 구조 변경 시 시스템 창 결과 대기, 취소 후 공유, 중복 실행 차단, QR 원문 보존을 유지한다.
- 커밋은 기능 변경, 구조 변경, 지침 변경을 구분한다. 구조 변경 커밋에 무관한 디자인이나 기능 추가를 섞지 않는다.
- 에뮬레이터 설치·실행은 사용자가 명시적으로 요청하기 전까지 하지 않는다.

## EAS로 빌드하기

EAS를 사용하면 앱 빌드, 서명, 스토어 제출을 클라우드에서 할 수 있고(`eas build`, `eas submit`), OTA 업데이트도 배포할 수 있다(`eas update`). 로컬에 Xcode나 Android Studio가 없어도 된다. EAS CLI는 `npx eas-cli@latest <command>`로 실행하고, 문서 예제의 `eas`를 이것으로 바꿔서 사용한다.
문서: https://docs.expo.dev/eas/index.md

## 규칙

- `ios/`, `android/` 폴더가 없다면 자동 생성되는 폴더다(Continuous Native Generation). 직접 만들거나 수정하지 않는다. 네이티브 동작은 `app.json`과 config plugin으로 설정한다.
- Expo Go는 사용하지 않는다. 항상 development build를 사용한다: 로컬에서는 `npx expo run:android`, 클라우드에서는 `npx eas-cli@latest build --profile development`.
- 서드파티 라이브러리보다 Expo 권장 모듈을 우선하고, 의존성을 추가하기 전에 사용 가능한 skill을 확인한다. 문서: https://docs.expo.dev/versions/latest/index.md
