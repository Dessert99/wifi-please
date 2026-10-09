# WiFi Please

식당이나 카페의 와이파이 안내문을 읽어 시스템 네트워크 저장 창을 열고 친구에게 공유하는 앱

## 출시 준비

- [Google Play 적용 요건과 제출 체크리스트](docs/google-play-release.md)
- [현재 사용량 제한과 인원별 비용 계산](docs/usage-capacity.md)
- 개인정보처리방침 원문: `shared/privacy.json`, 이용약관 원문: `shared/terms.json`
- 앱 촬영 화면 아래에서 개인정보처리방침과 이용약관을 열 수 있습니다.

공개 개발자명과 문의 이메일은 아직 확정되지 않았습니다. `shared/privacy.json`에 실제 값을 입력하고 Worker의 `/privacy`, `/terms`를 공개한 뒤 제출해야 합니다. `npm run check:release`와 EAS production 사전 검사에서 누락을 차단합니다. 이전에 보고한 네이티브 라이브러리 14개의 RELRO 문제는 검사기의 오탐으로 정정했습니다. Android Studio 기준으로 검사기를 수정했고 로컬 APK·AAB의 64비트 라이브러리 54개와 APK ZIP 정렬을 확인했습니다. 실기기 확인 범위와 상세 결과는 출시 체크리스트에 있습니다.

## 앱 이름과 식별자

- 앱 표시 이름: `WiFi Please`
- Expo slug와 앱 패키지 이름: `wifi-please`
- Android 패키지: `com.wifiplease.app`
- 딥링크 스킴: `wifiplease`
- Cloudflare Worker: `wifi-please-server`
- 사진 인식 서버 주소: `.env`의 `EXPO_PUBLIC_SCAN_API_URL`

Cloudflare 계정의 `snapfi.workers.dev` 하위 도메인은 기존 값을 유지합니다. 공개 API에서 변경 요청이 거절되어 Worker 이름만 변경했고, 서버 주소는 `https://wifi-please-server.snapfi.workers.dev`입니다. 계정 하위 도메인을 대시보드에서 변경하면 `.env`도 실제 주소에 맞춰 갱신해야 합니다.

Expo는 새 이름의 프로젝트에 연결했습니다. 이전 프로젝트는 삭제하지 않고 보존하며 새 빌드는 현재 `app.json`의 프로젝트 ID를 사용합니다. 앱 표시 이름, Android 패키지와 딥링크 변경은 새 development build 설치 후 적용됩니다.

## 브랜드 아이콘

검정 `#171717` 바탕에 흰색 손과 와이파이를 조합한 F안을 사용합니다. "와이파이 좀 주세요"와 "와이파이 줄게"를 같은 손짓으로 표현합니다. 앱 UI의 블루 포인트 색은 유지합니다.

- 벡터 원본: `assets/brand/wifi-please.svg`
- 기본·iOS 아이콘: `assets/images/icon.png`, 1024×1024 불투명 PNG
- Google Play 등록용: `assets/images/play-store-icon.png`, 512×512 불투명 PNG
- Android 전경·단색: `assets/images/android-icon-foreground.png`, `android-icon-monochrome.png`, 1024×1024 투명 PNG
- 시작 화면: `assets/images/splash-icon.png`, 1024×1024 투명 PNG
- 웹 아이콘: `assets/images/favicon.png`, 48×48 PNG

내보낼 때 원본의 모서리를 자르거나 그림자를 넣지 않습니다. 투명 이미지는 배경 사각형을 제외하고, Android 레이어는 심볼을 중앙 기준 84%로 축소합니다. [Android 적응형 아이콘의 안전 영역](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)에 맞춰 도형을 배치했습니다. `BrandMark`는 기본 아이콘 이미지를 재사용합니다.

설치 아이콘과 네이티브 시작 화면 변경은 새 빌드에 반영됩니다. 최종 런처 표시와 시작 화면은 실기기에서 확인해야 합니다.

## 주요 기능

- **카메라로 촬영해서 인식**: 와이파이 안내문을 찍으면 아이디와 비밀번호를 자동으로 읽습니다
- **갤러리 사진으로 인식**: 미리 찍어둔 사진으로도 인식할 수 있습니다
- **와이파이 QR 코드 스캔**: 카메라에 QR 코드를 비추면 자동으로 인식합니다
- **친구에게 공유**: 시스템 연결 창을 닫으면 와이파이 공유 화면이 열립니다. 공유하기를 누르면 시스템 공유 창이 열립니다. 카카오톡 등 원하는 앱으로 와이파이 이름과 비밀번호를 텍스트로 보낼 수 있습니다. React Native 기본 `Share` API를 사용합니다
- **QR과 비밀번호 확대**: 친구의 휴대폰에는 와이파이 QR을 보여주고, 노트북에는 큰 비밀번호를 보여줄 수 있습니다. 비밀번호 복사도 지원합니다
- **찍으면 바로 시스템 와이파이 창**: 인식이 끝나면 앱 화면을 거치지 않고 폰의 와이파이 연결 창이 바로 뜹니다. 아이디와 비밀번호가 이미 들어가 있어서 확인만 누르면 됩니다

## 사용 흐름

1. 처음에는 카메라 권한을 안내합니다. 허용한 뒤에는 바로 카메라가 열립니다. 권한 없이도 갤러리 사진을 선택할 수 있습니다
2. 첫 사진 작업은 Cloudflare·Anthropic 전송 고지에 동의한 뒤 촬영하거나 사진을 고릅니다. QR은 사진 전송 동의 없이 기기에서 읽습니다
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
- 사진 AI에는 설치별 하루 10회·분당 3회·동시 1회 및 전체 하루 300회·월 3,000회 제한을 적용합니다. 공개 서버는 Play Integrity 검증과 서버 집계를 통과한 요청만 AI에 전달합니다
- QR 코드는 서버를 거치지 않고 앱에서 바로 읽습니다
- Android 11 이상의 `ACTION_WIFI_ADD_NETWORKS`를 Expo 로컬 Kotlin 모듈로 호출합니다
- 개방형, WPA/WPA2, WPA3(SAE)를 시스템 창에 전달합니다. 지원하지 않는 보안 방식은 정보 보기로 복구합니다
- QR의 보안 방식과 숨김 여부, 정보의 공백과 특수문자를 공유 과정에서도 보존합니다
- 앱 검증 대기는 20초, 서버 응답 대기는 50초로 제한하며, 오프라인·요청 제한·인식 실패를 구별합니다
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

- Node.js 22.13 이상
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

현재 프로젝트는 [dessert99/wifi-please](https://expo.dev/accounts/dessert99/projects/wifi-please)에 연결되어 있습니다. 앱 빌드는 `server/`가 아닌 프로젝트 루트에서 실행합니다. 무료 플랜과 남은 빌드 한도를 확인한 뒤 실행합니다.

개발 서버 없이 실기기에서 확인하려면 `preview`로 APK를 만듭니다.

```bash
npx eas-cli@latest build --profile preview --platform android
```

프로젝트 대시보드의 Environment variables에 `EXPO_PUBLIC_SCAN_API_URL`을 `Plain text`로 등록합니다. 값은 `https://wifi-please-server.snapfi.workers.dev`이며, 테스트 빌드에는 `preview` 환경을 선택합니다. 다른 환경에서도 같은 서버를 쓰면 해당 환경에도 등록합니다. `eas.json`의 각 프로필은 같은 이름의 환경을 사용합니다. `ANTHROPIC_API_KEY`는 Cloudflare secret에만 두며 EAS나 앱에 넣지 않습니다.

사진 인식은 별도 Claude API 요금과 사용 제한이 적용됩니다. 운영 예산은 사용자가 결정하며 자동 검증은 QR과 모의 응답을 사용합니다.

코드를 바꾸면서 개발 서버에 연결할 때는 `development`를 사용합니다.

```bash
npx eas-cli@latest login --browser
npx eas-cli@latest build --profile development --platform android

# 완성된 APK를 휴대폰에 설치한 뒤 개발 서버 실행
npx expo start --dev-client
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
  components/           앱 공통 UI
    brand-mark.tsx      브랜드 심볼
    ui/                 버튼, 팝업, 아이콘, 화면 틀, 토스트
  constants/            공통 색상과 글꼴 스타일
  features/wifi/        와이파이 기능
    types.ts            공통 와이파이 타입
    session.tsx          메모리 세션
    use-capture.ts       촬영, 인식, 연결 순서와 중복 실행 제어
    use-camera-lifecycle.ts  권한, 화면 포커스, 앱 활성 상태
    use-share-actions.ts 공유, 복사, 재연결 상태와 동작
    components/         와이파이 전용 화면 부품
    lib/                QR 해석과 생성
    services/           사진 인식 요청, 시스템 연결·공유·복사
    __tests__/          기능별 Vitest 테스트
server/                 프록시 서버 (Cloudflare Workers, 사진을 Claude에 보내고 결과만 돌려줌)
modules/
  wifi-manager/         Android 와이파이 연결 네이티브 코드 (Kotlin)
assets/                 앱 아이콘, 스플래시 이미지
```

파일 배치와 의존 관계는 [AGENTS.md의 분리 원칙](AGENTS.md#파일-구조와-분리-원칙)을 따릅니다. 훅은 상태와 동작을 반환하고, 표시와 스타일은 컴포넌트가 담당합니다. 각 파일의 역할과 함께 유지하는 이유는 [파일별 책임](AGENTS.md#파일별-책임)에 정리되어 있습니다.

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

Kotlin 모듈은 이전 개발 빌드에서 컴파일했고 사용자가 실기기의 시스템 네트워크 저장 창을 확인했습니다. 새 권한 설정과 동의·정책 화면을 포함한 최종 제출 빌드에서 실제 연결, 카카오톡 공유, 다른 휴대폰의 QR 인식, Android 11 사진 선택을 다시 확인해야 합니다. 출시용 아이콘은 적용했고 iOS 직접 연결은 지원하지 않습니다.

## 사진 인식 보호 설정

새 코드에는 Play Integrity와 설치별·전체 이용 제한이 포함되어 있습니다. 서버 배포 및 Play Console 연결은 아직 하지 않았습니다. `EXPO_PUBLIC_PLAY_CLOUD_PROJECT_NUMBER`와 Worker의 `PLAY_SERVICE_ACCOUNT_JSON` secret을 준비한 뒤 서버와 새 앱 빌드를 함께 검증해야 합니다. 프로젝트 번호는 공개 값이며 서비스 계정 비밀키는 앱이나 Git에 넣지 않습니다.

`@expo/app-integrity`, `expo-crypto`, `expo-secure-store`가 추가되어 기존 development build에는 핫 리로드만으로 반영되지 않습니다. 에뮬레이터 없이 실기기용 앱을 다시 빌드해야 합니다. 상세 절차와 제한 문구는 [운영 용량 문서](docs/usage-capacity.md#사진-인식-남용-방지-설정)에 있습니다.
