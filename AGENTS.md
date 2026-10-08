Expo/React Native 모바일 앱이다. 모바일 우선 패턴, 성능, 크로스플랫폼 호환성을 우선한다.

## 프로젝트 결정 사항

WiFi Please: 식당이나 카페의 와이파이 안내문을 찍으면 바로 연결해 주는 앱. 아래는 사용자와 정한 결정이며, 바꾸기 전에 사용자에게 확인한다.

- **앱 화면 없이 바로 시스템 와이파이 창**: 촬영이나 QR 인식이 끝나면 앱 안의 확인/수정 화면을 거치지 않고 바로 시스템 와이파이 연결 창을 띄운다. 앱 확인 화면은 사용자 요청으로 삭제했으니 다시 만들지 않는다.
- **사진 인식은 AI로**: 온디바이스 OCR(ML Kit)과 규칙 기반 파싱은 쓰지 않는다. 사진은 긴 쪽 1024px JPEG로 줄여 프록시 서버로 보내고, 서버가 Claude Haiku 4.5(`claude-haiku-4-5`)로 와이파이 이름과 비밀번호를 뽑는다. 규칙 기반 파서는 정확도 문제로 일부러 지웠다.
- **QR 코드는 앱에서 직접**: 와이파이 QR(`WIFI:S:...;P:...;;`)은 서버를 거치지 않고 `src/features/wifi/lib/wifi-qr.ts`로 읽는다.
- **공유는 기본 Share API**: React Native의 `Share.share()`로 와이파이 이름과 비밀번호를 텍스트로 공유한다. 공유 버튼은 하나로 두고, 사용자가 시스템 공유 창에서 카카오톡 등 앱을 선택한다. 카카오 SDK나 자체 대화방 선택 화면은 만들지 않는다. 시스템 연결 창을 닫은 뒤 공유 화면을 연다. QR 확대, 비밀번호 확대 및 복사를 제공한다. 사용자가 전체 화면 시안을 승인했다. 와이파이 정보는 앱 메모리에만 보관하며 라우트 파라미터나 저장소에 기록하지 않는다.
- **프록시 서버는 Cloudflare Workers**: `server/` 폴더. API 키는 Cloudflare secret(`ANTHROPIC_API_KEY`)에만 있고 앱에는 절대 넣지 않는다. IP당 1분 10회 요청 제한이 있다. 배포 주소는 `.env`의 `EXPO_PUBLIC_SCAN_API_URL`. Vercel은 무료 요금제가 비상업 용도만 허용해서 쓰지 않기로 했다.
- **Android 먼저**: Android 11 이상을 우선 지원하고 iOS는 나중에 한다. 시스템 와이파이 창은 `Settings.ACTION_WIFI_ADD_NETWORKS`(Android 11+)를 쓴다. `src/features/wifi/services/connect-wifi.ts`의 `openSystemWifiDialog()`는 Kotlin 네이티브 모듈(`modules/wifi-manager/`)을 호출한다. 시스템 창의 저장/취소 결과를 기다리며 실제 연결 성공으로 표시하지 않는다. 네이티브 코드는 실기기 검증이 필요하다.
- **디자인**: 포인트 색 블루 `#1A73E8`, 밝은 바탕 `#F5F6F8`. 값은 `src/constants/theme.ts`에 있다. 앱 이름은 WiFi Please. 기술 식별자는 `wifi-please`, Android 패키지는 `com.wifiplease.app`, 딥링크 스킴은 `wifiplease`로 통일한다.
- **로고**: 사용자가 고른 F안, "손 위의 와이파이"를 사용한다. 검정 `#171717` 바탕과 흰색 심볼이며 원본은 `assets/brand/wifi-please.svg`다. 앱 아이콘, 시작 화면, 앱 내부 브랜드 마크에 동일한 도형을 사용한다. Android 전경과 단색 레이어만 중앙 기준 84%로 축소해 안전 영역을 확보한다. 앱 UI의 블루 포인트 색은 유지한다.
- **출시 개인정보 처리**: 사진 작업 전 외부 전송을 고지하고 명시적 동의를 받는다. QR에는 AI 동의를 요구하지 않는다. 사진 인식 뒤 확인 화면을 추가하는 것과 구분한다. 정책 원문은 `shared/`에서 앱과 Worker가 함께 사용한다. 실제 운영자 연락처 없이 production 빌드나 정책 정식 공개를 완료 처리하지 않는다.

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
    +native-intent.tsx
    index.tsx
    share.tsx
    qr.tsx
    password.tsx
    privacy.tsx
    terms.tsx
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
      photo-cache.ts             작업 사진 사본의 안전한 삭제
      connect-wifi.ts            시스템 연결 창 호출
      share-wifi.ts              시스템 Share 호출
      copy-wifi-password.ts      클립보드 복사와 실패 결과 정규화
    __tests__/                   기능별 Vitest 테스트
modules/wifi-manager/             Expo 로컬 Kotlin 모듈
server/                          독립 Cloudflare Workers 서버
shared/                          앱과 서버가 함께 사용하는 정책 원문
scripts/                         출시 전 검사
plugins/                         생성되는 네이티브 프로젝트의 설정 변경
docs/                            출시 요건과 운영 용량 근거
```

- `app/`은 화면 구성과 라우팅을 담당한다. 짧은 화면을 다른 폴더로 옮겨 재수출하는 파일을 만들지 않는다.
- 공통 UI는 `features/`와 `expo-router`에 의존하지 않는다. 공통 `Screen`의 `onBack`은 필수이며, 이동 대상과 이력이 없을 때의 처리는 사용하는 화면에서 결정한다. 와이파이 타입이나 동작이 필요한 컴포넌트는 `features/wifi/components/`에 둔다.
- 훅은 상태와 동작을 반환한다. JSX, 토스트 배치, 화면 스타일을 반환하지 않는다. 훅 파일은 `use-*.ts`, 렌더링 컴포넌트는 `.tsx`로 작성한다.
- 촬영부터 인식과 시스템 연결 창까지의 순서 및 실행 잠금은 `use-capture.ts`가 소유한다. 작업별로 잠금을 나눠 중복 실행을 허용하지 않는다.
- 카메라 권한과 앱 활성 상태는 `use-camera-lifecycle.ts`가 담당한다. 촬영·인식·연결 결과와 오류 안내는 촬영 흐름에서 처리한다.
- `types.ts`와 `lib/`는 React, Expo, React Native 런타임과 네이티브 모듈에 의존하지 않는다. 동일한 와이파이 정보를 별도 타입으로 중복 정의하지 않는다.
- `services/`는 사진 인식 요청과 와이파이 연결·공유·복사의 외부 API 호출을 담당한다. 화면 이동이나 JSX를 포함하지 않는다. 비밀번호를 저장하거나 로그에 출력하지 않는다.
- 카메라 촬영과 사진 선택은 `use-capture.ts`, 권한과 AppState 구독은 `use-camera-lifecycle.ts`에서 직접 Expo API를 사용한다. 화면 수명과 촬영 잠금에 묶이는 동작이므로 단순 호출을 감싸기 위한 서비스를 추가하지 않는다. 공유 훅은 연결·공유·복사 SDK를 직접 호출하지 않고 각 서비스를 사용한다.
- 스타일은 사용하는 컴포넌트 파일에 둔다. 공통 색상과 글꼴 스타일만 `theme.ts`에서 공유하며, 여러 컴포넌트의 내부 스타일을 하나의 객체로 내보내지 않는다.
- 함수와 주요 분기에는 역할이나 처리 이유를 설명하는 한 줄 한국어 주석을 둔다. 기존 주석이 설명하는 내용은 중복하지 않고, 단순 스타일 값이나 테스트 이름을 그대로 되풀이하지 않는다.
- 함수마다 파일이나 훅을 만들지 않는다. 함께 바뀌는 로직은 함께 두며, QR 해석과 생성은 같은 파일에 둔다.
- 테스트는 기능의 `__tests__/`에 두고 `.test.ts` 또는 `.test.tsx`로 작성한다. 구조 변경 시 시스템 창 결과 대기, 취소 후 공유, 중복 실행 차단, QR 원문 보존을 유지한다.
- 커밋은 기능 변경, 구조 변경, 지침 변경을 구분한다. 구조 변경 커밋에 무관한 디자인이나 기능 추가를 섞지 않는다.
- 에뮬레이터 설치·실행은 사용자가 명시적으로 요청하기 전까지 하지 않는다.

### 파일별 책임

단일 책임은 파일마다 함수 하나를 두는 규칙이 아니다. 같은 변경 이유와 수명을 가진 코드는 묶고, 시스템 연동·작업 상태·화면 표시가 서로의 내부 구현을 알지 않도록 한다. 파일을 추가하거나 책임을 옮길 때 아래 목록도 갱신한다.

화면과 공통 UI의 경계:

| 파일 | 맡는 일 | 맡지 않는 일 |
| --- | --- | --- |
| `src/app/_layout.tsx` | Stack과 앱 전역 세션 Provider 구성 | 인식·공유 작업 실행 |
| `src/app/+native-intent.tsx` | 외부 네이티브 링크의 허용 화면·길이 검사와 쿼리 제거 | 와이파이 데이터 전달, 웹 라우팅 |
| `src/app/index.tsx` | 권한 안내·카메라 화면 조합, 플래시 표시 상태, 사용자 입력 연결 | 서버 통신, 시스템 와이파이 호출 구현 |
| `src/app/share.tsx` | 정보·QR·공유 버튼 배치, 정보 없음 처리, 화면 이동 정책 | 공유·복사 SDK 호출 |
| `src/app/qr.tsx` | QR 확대 화면 구성, 정보 없음 처리, 뒤로 가기 정책 | QR 문자열 규칙, 시스템 공유 구현 |
| `src/app/password.tsx` | 비밀번호 확대 화면 구성, 빈 정보 처리, 뒤로 가기 정책 | 클립보드 접근, 비밀번호 가공 |
| `src/app/privacy.tsx` | 개인정보처리방침·문의·약관 진입 표시 | 정책 원문 중복 정의, 사진 전송 동의 결정 |
| `src/app/terms.tsx` | 이용약관 표시와 화면 이동 | 정책 원문 중복 정의, 서비스 작업 실행 |
| `src/components/brand-mark.tsx` | 출시 아이콘 이미지를 재사용한 브랜드 마크 표시 | 심볼 도형의 중복 정의, 앱 상태와 화면 이동 |
| `src/components/ui/button.tsx` | 버튼의 표시·접근성·입력 상태 | 클릭 이후 업무 처리 |
| `src/components/ui/dialog.tsx` | 안내 팝업과 버튼 렌더링, 표시 계약인 `DialogState` 정의 | 오류 분류, 재시도 정책 결정 |
| `src/components/ui/icon.tsx` | 공통 아이콘 도형과 크기·색 표현 | 기능 상태 판단 |
| `src/components/ui/screen.tsx` | 안전 영역·헤더·스크롤·하단 영역 배치, 전달받은 `onBack` 실행 | Router 접근, 이동 대상 결정 |
| `src/components/ui/toast.tsx` | 전달받은 문구와 위치로 토스트 표시 | 표시 시간·복사 결과 관리 |
| `src/constants/theme.ts` | 공통 색상과 글꼴 스타일 정의 | 개별 화면 배치와 내부 스타일 |

와이파이 기능의 경계:

| 파일 | 맡는 일 | 맡지 않는 일 |
| --- | --- | --- |
| `src/features/wifi/types.ts` | 와이파이 공통 데이터 타입 정의 | SDK 의존, 실행 로직 |
| `src/features/wifi/session.tsx` | 메모리 세션 Provider와 접근 훅 | 영구 저장, 라우트 파라미터 전달 |
| `src/features/wifi/use-capture.ts` | 사진 전송 동의, 촬영·사진 선택·QR부터 연결·공유까지 조율, 실행 잠금·오류 안내·재시도 사진 수명 | JSX, 서버 통신·네이티브 연결 세부 구현 |
| `src/features/wifi/use-camera-lifecycle.ts` | 카메라 참조·준비 상태, 권한 요청, 화면 포커스와 AppState 구독·해제 | 사진 인식, 연결 결과 처리, 오류 팝업 렌더링 |
| `src/features/wifi/use-share-actions.ts` | 공유·복사·재연결 작업의 상태, 중복 실행 방지, 재시도, 토스트 표시 시간 | SDK 직접 호출, JSX·배치 |
| `src/features/wifi/components/camera-permission.tsx` | 최초 권한·거부 상태에 맞는 안내와 버튼 표시 | 권한 요청·설정 앱 열기 실행 |
| `src/features/wifi/components/scan-frame.tsx` | 카메라 인식 틀 표시 | QR 인식과 촬영 실행 |
| `src/features/wifi/components/shutter-button.tsx` | 촬영 버튼 표시·입력 상태 | 카메라 접근 |
| `src/features/wifi/components/wifi-qr.tsx` | 와이파이 정보를 QR 이미지로 렌더링, 크기·여백 결정 | QR 형식 규칙, 네트워크 연결 |
| `src/features/wifi/components/share-feedback.tsx` | 공유 훅의 상태를 팝업·토스트로 표시하고 위치 결정 | 공유 실행, 오류 상태와 타이머 관리 |
| `src/features/wifi/lib/wifi-qr.ts` | 동일한 WIFI 형식의 해석·생성·이스케이프 처리 | React, Expo, 네트워크와 기기 접근 |
| `src/features/wifi/services/scan-photo.ts` | 인식 요청에 필요한 사진 축소·인코딩, HTTP 요청, 제한시간·응답 검사 | 사용자 안내 문구와 화면 이동 |
| `src/features/wifi/services/photo-cache.ts` | 앱 캐시의 작업 사본만 삭제하고 실패를 격리 | 갤러리 원본 삭제, 재시도 수명 결정 |
| `src/features/wifi/services/connect-wifi.ts` | 플랫폼 지원 확인과 네이티브 연결 결과 전달 | 공유 화면 전환, 실제 인터넷 연결 성공 판정 |
| `src/features/wifi/services/share-wifi.ts` | 시스템 공유용 텍스트 구성과 Share API 호출 | 공유 완료 UI, 수신 앱·대화방 선택 |
| `src/features/wifi/services/copy-wifi-password.ts` | 비밀번호 원문 복사, 플랫폼의 실패 반환값을 오류로 정규화 | 토스트·재시도·표시 시간 관리 |

검증과 서버·네이티브 경계:

| 파일 | 맡는 일 |
| --- | --- |
| `src/features/wifi/__tests__/capture.test.tsx` | 연결 결과 대기·취소·실패 복구, 중복 입력, 앱 복귀 후 QR 억제 검증 |
| `src/features/wifi/__tests__/capture-screen.test.tsx` | 화면과 촬영 훅을 조합해 촬영 중 카메라 재설정 방지와 QR 입력 무시 검증 |
| `src/features/wifi/__tests__/share-actions.test.tsx` | 공유·복사 작업 상태와 실제 복사 서비스 조합 검증, 외부 SDK만 대체 |
| `src/features/wifi/__tests__/scan-photo.test.ts` | 인식 응답·네트워크 실패·요청 제한·시간 초과 검증 |
| `src/features/wifi/__tests__/parse-wifi-qr.test.ts` | 외부 WIFI 문자열 해석 규칙 검증 |
| `src/features/wifi/__tests__/wifi-qr.test.ts` | 생성과 해석을 왕복했을 때 원문과 보안 정보 보존 검증 |
| `modules/wifi-manager/index.ts` | Expo 네이티브 모듈 탐색과 TypeScript 호출 계약 |
| `modules/wifi-manager/expo-module.config.json` | Android 네이티브 모듈 등록 |
| `modules/wifi-manager/android/build.gradle` | 로컬 모듈의 빌드 설정 |
| `modules/wifi-manager/android/src/main/AndroidManifest.xml` | 로컬 모듈의 Android 선언 |
| `modules/wifi-manager/android/src/main/java/expo/modules/wifimanager/WifiManagerModule.kt` | 시스템 연결 창 실행, 결과 해석, 대기 Promise 수명 관리 |
| `server/src/index.ts` | 요청 경로 분기, `/scan` 검증·제한과 AI 호출·응답 처리 |
| `server/src/legal.ts` | 공유 원문을 공개 정책 HTML로 렌더링하고 미확정 연락처의 공개 완료 차단 |
| `shared/privacy.json`, `shared/terms.json` | 앱과 서버의 정책 원문·연락처를 한곳에서 관리 |
| `scripts/check-release.mjs` | production 빌드 전 공개 연락처 누락 검사 |
| `scripts/check-android-apk.py` | APK를 변경하지 않고 64비트 ELF LOAD·RELRO 및 ZIP의 16KB 정렬 검사 |
| `plugins/with-android-page-size.cjs` | 생성 Gradle에 로컬 CMake 링커의 16KB 옵션 적용, 외부 사전 빌드 바이너리는 변경하지 않음 |
| `src/features/wifi/__tests__/photo-cache.test.ts` | 캐시 경계와 원본 보존, 삭제 실패 격리 검증 |
| `src/__tests__/native-intent.test.ts` | 외부 링크 입력 제한과 기존 화면 경로 보존 검증 |
| `server/test/scan.test.ts` | 유료 호출 없이 입력 크기·요청 제한·민감 응답·정책 경로 검증 |
| `docs/google-play-release.md`, `docs/usage-capacity.md` | 심사 적용 범위·남은 작업과 운영 용량 가정·근거 관리 |
| `assets/store/feature-graphic.svg`, `assets/store/feature-graphic.png` | 기존 F 로고를 사용한 Google Play 기능 그래픽 원본과 출력 |
| `vitest.config.mts` | 테스트 환경·대상·경로 별칭 설정 |
| `eslint.config.js` | 코드 검사와 공통 UI·공유 훅의 정적 import 경계 검사 |

공통 UI의 Router·기능 의존과 공유 훅의 직접 SDK import는 ESLint에서 오류로 처리한다. 이 검사는 정적 import 경계를 확인하며, 그 밖의 책임 분리는 위 표를 기준으로 리뷰한다.

### 함께 유지하는 코드

- QR 해석과 생성은 같은 WIFI 규격과 이스케이프 규칙에 따라 바뀌므로 `lib/wifi-qr.ts`에 함께 둔다.
- 세션 Provider와 접근 훅은 하나의 Context 수명을 공유하므로 `session.tsx`에 함께 둔다.
- 카메라 권한·참조·AppState·포커스는 카메라 사용 가능 여부를 함께 결정하므로 `use-camera-lifecycle.ts`에 함께 둔다.
- 공유·복사·재연결 작업은 같은 화면의 피드백과 공유/재연결 잠금을 조율하므로 `use-share-actions.ts`에 함께 둔다. SDK 구현은 서비스로 분리한다.
- 사진 축소·인코딩·전송·응답 검사는 하나의 사진 인식 요청 계약을 구현하므로 `services/scan-photo.ts`에 함께 둔다. 별도로 재사용할 요구가 생기기 전까지 나누지 않는다.
- 각 컴포넌트의 props 타입과 스타일은 해당 컴포넌트에 둔다. 공통 도형인 `Icon`과 `FlashIcon`도 같은 아이콘 파일에 둔다.

## EAS로 빌드하기

- 사용자는 무료만 사용한다. 클라우드 빌드 전에 계정의 Free 플랜과 남은 무료 빌드 한도를 확인한다. 유료 플랜 전환이나 추가 과금이 필요한 작업은 실행하지 않는다. 한도가 소진되면 초기화를 기다리거나 로컬 빌드를 사용한다.
- 사진 인식의 Claude API는 별도 유료 서비스다. 운영 비용은 사용자가 결정한다. 자동 검증은 QR과 모의 응답으로 수행하며 사용자의 승인 없이 유료 API 호출로 검증하지 않는다.

EAS를 사용하면 앱 빌드, 서명, 스토어 제출을 클라우드에서 할 수 있고(`eas build`, `eas submit`), OTA 업데이트도 배포할 수 있다(`eas update`). 로컬에 Xcode나 Android Studio가 없어도 된다. EAS CLI는 `npx eas-cli@latest <command>`로 실행하고, 문서 예제의 `eas`를 이것으로 바꿔서 사용한다.
문서: https://docs.expo.dev/eas/index.md

## 규칙

- `ios/`, `android/` 폴더가 없다면 자동 생성되는 폴더다(Continuous Native Generation). 직접 만들거나 수정하지 않는다. 네이티브 동작은 `app.json`과 config plugin으로 설정한다.
- Expo Go는 사용하지 않는다. 항상 development build를 사용한다: 로컬에서는 `npx expo run:android`, 클라우드에서는 `npx eas-cli@latest build --profile development`.
- 서드파티 라이브러리보다 Expo 권장 모듈을 우선하고, 의존성을 추가하기 전에 사용 가능한 skill을 확인한다. 문서: https://docs.expo.dev/versions/latest/index.md
