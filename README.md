# Snapfi

식당이나 카페의 와이파이 안내문을 찍으면 바로 연결해 주는 앱

## 주요 기능

- **카메라로 촬영해서 인식**: 와이파이 안내문을 찍으면 아이디와 비밀번호를 자동으로 읽습니다
- **갤러리 사진으로 인식**: 미리 찍어둔 사진으로도 인식할 수 있습니다
- **와이파이 QR 코드 스캔**: 카메라에 QR 코드를 비추면 자동으로 인식합니다
- **찍으면 바로 시스템 와이파이 창**: 인식이 끝나면 앱 화면을 거치지 않고 폰의 와이파이 연결 창이 바로 뜹니다. 아이디와 비밀번호가 이미 들어가 있어서 확인만 누르면 됩니다

## 사용 흐름

1. 앱을 켜면 바로 카메라가 열립니다
2. 와이파이 안내문을 찍거나, 갤러리에서 사진을 고르거나, QR 코드를 비춥니다
3. 아이디와 비밀번호가 채워진 시스템 와이파이 창이 뜹니다
4. 확인을 누르면 와이파이에 접속합니다

## 동작 방식

```
사진 → 글자 인식(OCR) → 와이파이 아이디와 비밀번호 골라내기 → 시스템 와이파이 창 → 연결
QR 코드 ─────────────────→ 와이파이 아이디와 비밀번호 읽기 ──┘
```

- 글자 인식은 폰 안에서 처리합니다. 서버가 없고 인터넷이 연결되지 않아도 동작합니다
- Android에서는 주변 와이파이 목록과 비교해서 잘못 읽힌 와이파이 이름을 바로잡습니다

## 지원 환경

- Android 11 이상
- iOS는 추후 지원 예정

## 기술 스택

- [Expo](https://expo.dev) SDK 57, React Native, TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/): 화면 이동
- [Google ML Kit Text Recognition](https://developers.google.com/ml-kit/vision/text-recognition/v2): 글자 인식 (한국어 모델)
- Expo Modules API (Kotlin): Android 와이파이 연결
- Expo Go 대신 development build를 사용합니다

## 개발 환경 준비

필요한 것

- Node.js 22 이상
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
    index.tsx           촬영 화면 (카메라, 갤러리, QR)
  components/           화면 부품 (셔터 버튼, 인식 틀, 아이콘 등)
  constants/            색상 등 디자인 값
  lib/                  핵심 기능
    ocr.ts              사진에서 글자 읽기
    parse-wifi.ts       읽은 글자에서 아이디와 비밀번호 골라내기
    parse-wifi-qr.ts    와이파이 QR 코드 읽기
    wifi.ts             시스템 와이파이 창 띄우기
modules/
  wifi-manager/         Android 와이파이 연결 네이티브 코드 (Kotlin)
assets/                 앱 아이콘, 스플래시 이미지
```
