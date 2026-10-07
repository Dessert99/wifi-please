# Snapfi

식당이나 카페의 와이파이 안내문을 찍으면 바로 연결해 주는 앱

## 주요 기능

- **카메라로 촬영해서 인식**: 와이파이 안내문을 찍으면 아이디와 비밀번호를 자동으로 읽습니다
- **갤러리 사진으로 인식**: 미리 찍어둔 사진으로도 인식할 수 있습니다
- **와이파이 QR 코드 스캔**: 카메라에 QR 코드를 비추면 자동으로 인식합니다
- **친구에게 공유**: 시스템 연결 창을 닫으면 와이파이 공유 화면이 열립니다. 공유하기를 누르면 시스템 공유 창이 열립니다. 카카오톡 등 원하는 앱으로 와이파이 이름과 비밀번호를 텍스트로 보낼 수 있습니다. React Native 기본 `Share` API를 사용합니다
- **QR과 비밀번호 확대**: 친구의 휴대폰에는 와이파이 QR을 보여주고, 노트북에는 큰 비밀번호를 보여줄 수 있습니다. 비밀번호 복사도 지원합니다
- **찍으면 바로 시스템 와이파이 창**: 인식이 끝나면 앱 화면을 거치지 않고 폰의 와이파이 연결 창이 바로 뜹니다. 아이디와 비밀번호가 이미 들어가 있어서 확인만 누르면 됩니다

## 사용 흐름

1. 처음에는 카메라 권한을 안내합니다. 허용한 뒤에는 바로 카메라가 열립니다. 권한 없이도 갤러리 사진을 선택할 수 있습니다
2. 와이파이 안내문을 찍거나, 갤러리에서 사진을 고르거나, QR 코드를 비춥니다
3. 아이디와 비밀번호가 채워진 시스템 와이파이 창이 뜹니다
4. 시스템 창에서 네트워크 추가를 승인하거나 취소합니다. 앱은 실제 연결 성공 여부를 단정하지 않습니다
5. 공유 화면에서 카카오톡 등으로 정보를 보내거나 QR 및 비밀번호를 크게 보여줍니다
6. 촬영으로 돌아가도 최근 정보는 앱이 실행 중인 동안 다시 열 수 있습니다

## 동작 방식

```
사진 → 프록시 서버 → Claude Haiku 4.5가 아이디와 비밀번호 인식 → 시스템 와이파이 창 → 연결
QR 코드 ─────────────→ 앱에서 아이디와 비밀번호 바로 읽기 ─────┘
```

- 사진 인식은 AI(Claude Haiku 4.5)가 합니다. API 키는 앱이 아니라 프록시 서버(Cloudflare Workers)에만 있습니다
- QR 코드는 서버를 거치지 않고 앱에서 바로 읽습니다
- Android 11 이상의 `ACTION_WIFI_ADD_NETWORKS`를 Expo 로컬 Kotlin 모듈로 호출합니다
- 개방형, WPA/WPA2, WPA3(SAE)를 시스템 창에 전달합니다. 지원하지 않는 보안 방식은 정보 보기로 복구합니다
- QR의 보안 방식과 숨김 여부, 정보의 공백과 특수문자를 공유 과정에서도 보존합니다
- 인식 요청은 30초 뒤 중단하며, 오프라인·요청 제한·인식 실패를 구별합니다
- 비밀번호는 앱 메모리에만 보관합니다. 라우트 URL, 앱 저장소, 로그에 기록하지 않습니다
- 여러 네트워크 중 하나를 명확하게 정할 수 없는 안내문은 다시 촬영하도록 처리합니다. 이 프롬프트 변경은 서버를 다시 배포해야 적용됩니다

## 지원 환경

- Android 11 이상
- iOS는 추후 지원 예정

## 기술 스택

- [Expo](https://expo.dev) SDK 57, React Native, TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/): 화면 이동
- [Claude Haiku 4.5](https://platform.claude.com/docs/en/build-with-claude/vision): 사진에서 와이파이 정보 인식
- [Cloudflare Workers](https://developers.cloudflare.com/workers/): 프록시 서버
- Expo Modules API (Kotlin): Android 와이파이 연결
- Expo Go 대신 development build를 사용합니다

## 개발 환경 준비

필요한 것

- Node.js 22.12 이상
- Java 17
- [Android Studio](https://developer.android.com/studio) (Android SDK 포함)
- Android 11 이상 실기기와 USB 케이블 (에뮬레이터에서는 와이파이 기능을 제대로 테스트할 수 없습니다)

## 실행 방법

```bash
# 패키지 설치
npm install

# 폰을 USB로 연결하고 USB 디버깅을 켠 뒤 실행
npx expo run:android
```

처음 실행하면 `android/` 폴더가 자동으로 생성되고 앱이 빌드되어 폰에 설치됩니다. `android/` 폴더는 자동 생성되는 폴더라서 직접 수정하지 않고, 설정은 `app.json`에서 합니다.

Android Studio 없이 빌드하려면 [EAS Build](https://docs.expo.dev/build/introduction/)를 사용할 수 있습니다.

```bash
npx eas-cli@latest build --profile development --platform android
```

## 자주 쓰는 명령어

```bash
npx expo install <패키지>   # 패키지 설치 (Expo SDK 버전에 맞춰 설치됨)
npx expo start             # 개발 서버 실행
npx expo lint              # 코드 검사
npx tsc --noEmit           # 타입 검사
```

## 폴더 구조

```
src/
  app/                  화면 (파일 하나가 화면 하나)
    _layout.tsx         화면 이동 설정
    index.tsx           권한 안내 및 촬영 화면 (카메라, 갤러리, QR)
    share.tsx           QR 및 와이파이 정보 공유
    qr.tsx              QR 확대
    password.tsx        비밀번호 확대
  components/           화면 부품 (셔터 버튼, 인식 틀, 아이콘 등)
  features/wifi/        메모리 세션, 촬영 흐름, 공유 및 복사
  constants/            색상 등 디자인 값
  lib/                  핵심 기능
    parse-wifi-qr.ts    와이파이 QR 코드 읽기
    scan-api.ts         사진을 줄여서 프록시 서버로 보내고 인식 결과 받기
    wifi.ts             시스템 와이파이 창 띄우기
server/                 프록시 서버 (Cloudflare Workers, 사진을 Claude에 보내고 결과만 돌려줌)
modules/
  wifi-manager/         Android 와이파이 연결 네이티브 코드 (Kotlin)
assets/                 앱 아이콘, 스플래시 이미지
```

## 검증

```bash
npx expo lint
npx tsc --noEmit
npm test                  # Vitest 전체 테스트
npm run test:watch        # 변경 시 다시 실행
```

테스트 도구는 Vitest이며 설정은 `vitest.config.mts`에 있습니다. 네이티브 API는 테스트에서 모킹하고 React 훅과 데이터 처리 로직은 실제 구현으로 실행합니다.

자동 테스트는 QR 특수문자 왕복, 인식 응답과 제한시간, 중복 요청 차단, 시스템 창 결과 대기, 취소 후 공유, 연결 실패 복구 등을 검사합니다.

브라우저에서는 가상 카메라와 모의 인식 응답으로 화면 이동과 예외 처리를 검사합니다. 320px와 360px 화면, 긴 비밀번호, 비밀번호 없는 네트워크, 복사 원문 보존도 확인합니다. 이 검사는 Android 네이티브 실행을 대신하지 않습니다.

실기기에서 확인할 항목은 시스템 네트워크 추가/취소, 실제 와이파이 연결, 카카오톡 공유 창 전환, 다른 휴대폰의 QR 인식입니다. Kotlin 모듈의 네이티브 빌드와 실기기 검증은 아직 완료하지 않았습니다. 앱 아이콘은 기존 Expo 기본 아이콘이며 iOS 직접 연결은 지원하지 않습니다.
