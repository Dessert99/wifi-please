# 개발 문서

README에서 옮긴 내부 기록이다. 식별자와 외부 서비스 연결 상태, 아이콘 내보내기 기준, 빌드 절차, 검증 범위를 관리한다.

## 출시 준비

- [Google Play 적용 요건과 제출 체크리스트](google-play-release.md)
- [현재 사용량 제한과 인원별 비용 계산](usage-capacity.md)
- 개인정보처리방침 원문: `shared/privacy.json`, 이용약관 원문: `shared/terms.json`
- 앱 촬영 화면 아래에서 개인정보처리방침과 이용약관을 열 수 있다.

공개 개발자명과 문의 이메일은 `shared/privacy.json`에서 관리하며, Worker의 `/privacy`, `/terms`를 공개한 뒤 제출해야 한다. `npm run check:release`와 EAS production 사전 검사에서 누락을 차단한다. 이전에 보고한 네이티브 라이브러리 14개의 RELRO 문제는 검사기의 오탐으로 정정했다. Android Studio 기준으로 검사기를 수정했고 로컬 APK·AAB의 64비트 라이브러리 54개와 APK ZIP 정렬을 확인했다. 실기기 확인 범위와 상세 결과는 출시 체크리스트에 있다.

## 앱 이름과 식별자

- 앱 표시 이름: `WiFi Please`
- Expo slug와 앱 패키지 이름: `wifi-please`
- Android 패키지: `com.wifiplease.app`
- 딥링크 스킴: `wifiplease`
- Cloudflare Worker: `wifi-please-server`
- 사진 인식 서버 주소: `.env`의 `EXPO_PUBLIC_SCAN_API_URL`

Cloudflare 계정의 `snapfi.workers.dev` 하위 도메인은 기존 값을 유지한다. 공개 API에서 변경 요청이 거절되어 Worker 이름만 변경했고, 서버 주소는 `https://wifi-please-server.snapfi.workers.dev`다. 계정 하위 도메인을 대시보드에서 변경하면 `.env`도 실제 주소에 맞춰 갱신해야 한다.

Expo는 새 이름의 프로젝트에 연결했다. 이전 프로젝트는 삭제하지 않고 보존하며 새 빌드는 현재 `app.json`의 프로젝트 ID를 사용한다. 앱 표시 이름, Android 패키지와 딥링크 변경은 새 development build 설치 후 적용된다.

## 브랜드 아이콘

검정 `#171717` 바탕에 흰색 손과 와이파이를 조합한 F안을 사용한다. "와이파이 좀 주세요"와 "와이파이 줄게"를 같은 손짓으로 표현한다. 앱 UI의 블루 포인트 색은 유지한다.

- 벡터 원본: `assets/brand/wifi-please.svg`
- 기본·iOS 아이콘: `assets/images/icon.png`, 1024×1024 불투명 PNG
- Google Play 등록용: `assets/images/play-store-icon.png`, 512×512 불투명 PNG
- Android 전경·단색: `assets/images/android-icon-foreground.png`, `android-icon-monochrome.png`, 1024×1024 투명 PNG
- 시작 화면: `assets/images/splash-icon.png`, 1024×1024 투명 PNG
- 웹 아이콘: `assets/images/favicon.png`, 48×48 PNG
- 화면 미리보기: `assets/store/web-previews/`의 공유·QR·비밀번호 화면 1080×2160 JPEG (README에서 사용)

내보낼 때 원본의 모서리를 자르거나 그림자를 넣지 않는다. 투명 이미지는 배경 사각형을 제외하고, Android 레이어는 심볼을 중앙 기준 84%로 축소한다. [Android 적응형 아이콘의 안전 영역](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)에 맞춰 도형을 배치했다. `BrandMark`는 기본 아이콘 이미지를 재사용한다.

설치 아이콘과 네이티브 시작 화면 변경은 새 빌드에 반영된다. 최종 런처 표시와 시작 화면은 실기기에서 확인해야 한다.

## 사용 흐름

1. 처음에는 카메라 권한을 안내한다. 허용한 뒤에는 바로 카메라가 열린다. 권한 없이도 갤러리 사진을 선택할 수 있다.
2. 첫 사진 작업은 Cloudflare·Anthropic 전송 고지에 동의한 뒤 촬영하거나 사진을 고른다. QR은 사진 전송 동의 없이 기기에서 읽는다.
3. 이름과 비밀번호가 채워진 시스템 와이파이 창이 뜬다.
4. 시스템 창에서 네트워크 추가를 승인하거나 취소한다. 앱은 실제 연결 성공 여부를 단정하지 않는다.
5. 공유 화면에서 카카오톡 등으로 정보를 보내거나 QR 및 비밀번호를 크게 보여준다.
6. 촬영으로 돌아가도 최근 정보는 앱이 실행 중인 동안 다시 열 수 있다.

## 동작 세부

- 사진 AI에는 설치별 하루 10회·분당 3회·동시 1회 및 전체 하루 300회·월 3,000회 제한을 적용한다.
- 근처 기기 권한(Android 12 이하는 위치 권한)을 거부하면 인식한 값 그대로 시스템 창을 연다.
- 개방형, WPA/WPA2, WPA3(SAE)를 시스템 창에 전달한다. 지원하지 않는 보안 방식은 정보 보기로 복구한다.
- QR의 보안 방식과 숨김 여부, 정보의 공백과 특수문자를 공유 과정에서도 보존한다.
- 앱 검증 대기는 20초, 서버 응답 대기는 50초로 제한하며, 오프라인·요청 제한·인식 실패를 구별한다.
- 여러 네트워크 중 하나를 명확하게 정할 수 없는 안내문은 다시 촬영하도록 처리한다. 이 프롬프트 변경은 서버를 다시 배포해야 적용된다.

## EAS 빌드

현재 프로젝트는 [dessert99/wifi-please](https://expo.dev/accounts/dessert99/projects/wifi-please)에 연결되어 있다. 앱 빌드는 `server/`가 아닌 프로젝트 루트에서 실행한다. 무료 플랜과 남은 빌드 한도를 확인한 뒤 실행한다.

개발 서버 없이 실기기에서 확인하려면 `preview`로 APK를 만든다.

```bash
npx eas-cli@latest build --profile preview --platform android
```

프로젝트 대시보드의 Environment variables에 `EXPO_PUBLIC_SCAN_API_URL`을 `Plain text`로 등록한다. 값은 `https://wifi-please-server.snapfi.workers.dev`이며, 테스트 빌드에는 `preview` 환경을 선택한다. 다른 환경에서도 같은 서버를 쓰면 해당 환경에도 등록한다. `eas.json`의 각 프로필은 같은 이름의 환경을 사용한다. `ANTHROPIC_API_KEY`는 Cloudflare secret에만 두며 EAS나 앱에 넣지 않는다.

사진 인식은 별도 Claude API 요금과 사용 제한이 적용된다. 운영 예산은 사용자가 결정하며 자동 검증은 QR과 모의 응답을 사용한다.

코드를 바꾸면서 개발 서버에 연결할 때는 `development`를 사용한다.

```bash
npx eas-cli@latest login --browser
npx eas-cli@latest build --profile development --platform android

# 완성된 APK를 휴대폰에 설치한 뒤 개발 서버 실행
npx expo start --dev-client
```

## 검증 범위

테스트 도구는 Vitest이며 설정은 `vitest.config.mts`에 있다. 네이티브 API는 테스트에서 모킹하고 React 훅과 데이터 처리 로직은 실제 구현으로 실행한다.

자동 테스트는 QR 특수문자 왕복, 인식 응답과 제한시간, 중복 요청 차단, 시스템 창 결과 대기, 취소 후 공유, 연결 실패 복구 등을 검사한다.

브라우저에서는 가상 카메라와 모의 인식 응답으로 화면 이동과 예외 처리를 검사한다. 320px와 360px 화면, 긴 비밀번호, 비밀번호 없는 네트워크, 복사 원문 보존도 확인한다. 이 검사는 Android 네이티브 실행을 대신하지 않는다.

Kotlin 모듈은 이전 개발 빌드에서 컴파일했고 사용자가 실기기의 시스템 네트워크 저장 창을 확인했다. 새 권한 설정과 동의·정책 화면을 포함한 최종 제출 빌드에서 실제 연결, 카카오톡 공유, 다른 휴대폰의 QR 인식, Android 11 사진 선택을 다시 확인해야 한다. 출시용 아이콘은 적용했고 iOS 직접 연결은 지원하지 않는다.

## 사진 인식 보호 설정

새 코드에는 Play Integrity와 설치별·전체 이용 제한이 포함되어 있다. 서버 배포 및 Play Console 연결은 아직 하지 않았다. `EXPO_PUBLIC_PLAY_CLOUD_PROJECT_NUMBER`와 Worker의 `PLAY_SERVICE_ACCOUNT_JSON` secret을 준비한 뒤 서버와 새 앱 빌드를 함께 검증해야 한다. 프로젝트 번호는 공개 값이며 서비스 계정 비밀키는 앱이나 Git에 넣지 않는다.

`@expo/app-integrity`, `expo-crypto`, `expo-secure-store`가 추가되어 기존 development build에는 핫 리로드만으로 반영되지 않는다. 에뮬레이터 없이 실기기용 앱을 다시 빌드해야 한다. 상세 절차와 제한 문구는 [운영 용량 문서](usage-capacity.md#사진-인식-남용-방지-설정)에 있다.
