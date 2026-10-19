# WiFi Please Google Play 출시 준비

2026년 10월 8일 기준 Android 휴대폰용 앱에 적용되는 요건이다. 2026-10-19에 근처 와이파이 권한, 모델 전환, 공유 안내를 반영했다. 사진 인식, 시스템 Wi-Fi 저장, QR, 공유 기능은 출시 범위로 충분하다. 운영자 연락처와 계정 관련 절차는 별도로 완료해야 한다. 2026-10-09 재검토에서 기존 RELRO 차단 판단은 검사기 오탐으로 정정했다.

## 적용 요건과 현재 대응

| 항목 | 앱에 적용되는 내용 | 대응과 남은 일 |
| --- | --- | --- |
| 개인정보처리방침 | 모든 앱에 공개 웹 URL 및 앱 내 접근 수단 필요 | `shared/privacy.json`을 앱 `/privacy`와 Worker `/privacy`에서 함께 사용. 개발자명·문의 이메일 입력과 실제 배포 필요 |
| 사진 전송 고지 | 안내문 사진과 인증 정보를 외부 AI가 처리한다는 점을 사전 설명 | 첫 사진 작업 전에 전송 대상·목적·보관·QR 대안을 알리고 동의받음. 취소하면 사진 작업 실행 안 함 |
| 최소 권한 | 일회성 사진 선택은 시스템 선택기 사용 | 카메라와 근처 와이파이 확인 권한만 런타임 요청. 근처 와이파이는 Android 13+ `NEARBY_WIFI_DEVICES`(`neverForLocation`), Android 11~12는 정확한·대략적 위치(`maxSdkVersion` 32)이며 사진 인식 결과를 실제 SSID와 맞출 때만 요청. 거부해도 기능 유지. 저장소·전체 미디어·마이크·광고 ID·오버레이·진동·백그라운드 위치 권한 제외 |
| 안전한 처리 | 인증 정보의 전송·보관·노출 최소화 | HTTPS, 서버 secret, 메모리 세션, 임시 사진 정리, API 응답 `no-store`, 요청 크기·시간 제한 |
| 외부 링크 입력 | 공개 앱 스킴의 비정상 입력으로 인한 멈춤 방지 | `+native-intent.tsx`에서 길이 제한·화면 허용 목록·쿼리 제거. 계정이나 비밀번호를 링크로 받지 않음 |
| 데이터 보안 신고 | 서버로 보내는 사진은 수집에 해당 | 아래 신고 초안을 실제 제공자 설정과 대조해 Console에 입력 |
| 이용약관 | 모든 앱에 별도 동의 화면이 필수인 것은 아님 | `/terms`에 이용 권한, 공유 범위, AI·연결 한계, 문의·변경 안내 추가. 가입 절차는 추가하지 않음 |
| 계정 삭제 | 앱에서 계정을 만들 수 있는 경우 적용 | 앱 계정·가입 기능이 없어 현재 해당 없음. OS에 저장한 네트워크 삭제 방법은 개인정보 안내에 기재 |
| 목표 API | 신규 휴대폰 앱은 API 36 이상 | Expo SDK 57 기반. 최종 AAB의 targetSdk 재확인 |
| 64비트와 16KB | 네이티브 라이브러리 포함 앱의 호환성 확인 | 기존 RELRO 오탐 수정. 아래 빌드 산출물 검증 결과와 실기기 확인 범위 참조 |
| 배포 형식과 서명 | 신규 앱 Android App Bundle, 업로드 키와 Play App Signing 사용 | `production` EAS 프로필 사용. 로컬 점검용 debug 서명 APK는 제출하지 않음 |
| 작동 품질 | 충돌·멈춤·주요 기능 장애가 없어야 함 | 자동 테스트에 동의·권한과 인식 실패 복구 추가. 아래 실기기 항목은 최종 빌드에서 수행 |
| 정확한 설명 | 앱 기능과 한계를 사실대로 설명 | “저장 승인 = 연결 성공”, 비밀번호 해킹, 모든 기기 자동 접속으로 광고하지 않음 |
| 앱 접근 권한 신고 | 심사자가 모든 주요 기능을 사용할 수 있어야 함 | 로그인·유료 벽 없음. 사진 인식용 서버 가용성 유지 및 심사 메모 제공 |
| 광고·광고 ID | 실제 동작과 SDK에 맞게 답변 | 광고 없음, 광고 ID 미사용. 최종 manifest에서도 AD_ID 제거 확인 |
| 콘텐츠 등급 | IARC 설문 제출 필요 | 실제 기능 기준 응답. 등급을 코드에서 임의로 지정하지 않음 |
| 타깃 연령·어린이 | 실제 대상 사용자에 맞는 연령층 신고 | 카공 이용자 대상에 맞춰 운영자가 확정. 어린이를 포함하면 Families 의무를 추가 검토 |
| AI 생성 콘텐츠 | 생성형 챗봇·이미지 생성과 정보 추출은 범위가 다름 | 본 앱은 원문 정보 추출 도구라 제한적 생산성 AI로 보는 판단. 정책이 Wi-Fi 추출을 명시 면제한 것은 아니므로 심사 분류에 맞춰 재확인 |
| UGC·신고·차단 | 앱 안에서 사용자 콘텐츠를 공개·호스팅하는 경우 적용 | 앱 내 게시판·채팅·공개 콘텐츠 없음. 시스템 공유만 있으므로 현재 UGC 운영 기능은 추가하지 않음 |
| 결제·정기결제 | 디지털 유료 기능이 있으면 결제 정책 적용 | 현재 결제 없음. 향후 추가 시 별도 검토 |
| 특수 권한·기능 신고 | VPN, 접근성, 전체 파일, 백그라운드 위치, SMS, 알람, 전체 화면 intent 등 | 신고 양식이 필요한 권한은 사용하지 않음. Android 11~12의 위치 권한은 앱 사용 중 요청만 하므로 백그라운드 위치 신고 대상이 아님. 건강·금융 등 Console 공통 설문은 해당 기능 없음으로 사실대로 답변 |
| 개발자 계정·신원 | 개인·조직 정보, 연락처·기기 등 Console 인증 | 계정 유형과 등록 시점 확인 필요. Android 개발자 인증 화면의 패키지 등록 상태도 확인 |
| 신규 개인 계정 테스트 | 2023-11-13 이후 만든 개인 계정은 비공개 테스트 요건 적용 | 12명 이상이 연속 14일 참여한 뒤 프로덕션 접근 신청. 해당 여부 확인 필요 |
| 스토어 자료 | 제목·설명·아이콘·그래픽·스크린샷·연락처 | 아래 등록 초안과 기존 아이콘, `assets/store/feature-graphic.png` 준비. 실제 앱 스크린샷 최소 2장 필요 |
| 배포 국가와 지역 요건 | 국가별 소비자·개인정보·개발자 공개 의무가 달라짐 | 최초 배포 국가와 운영자 유형 확정 후 Console의 지역별 요청 처리. EU 배포 시 trader 상태 등 별도 확인 |

정책 근거: [사용자 데이터](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en), [최소 범위 권한](https://support.google.com/googleplay/android-developer/answer/16935362?hl=en), [목표 API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en), [16KB 호환](https://developer.android.com/guide/practices/page-sizes), [심사 준비](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en), [작동 품질](https://support.google.com/googleplay/android-developer/answer/9898783?hl=en), [AI 정책 범위](https://support.google.com/googleplay/android-developer/answer/14094294?hl=en), [개인 계정 테스트](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en), [개발자 인증](https://support.google.com/android-developer-console/answer/16561738?hl=en).

## 데이터 보안 신고 초안

**“아무 데이터도 수집하지 않음”으로 신고하면 안 된다.** 사진을 외부 서버에 보내며 Anthropic의 기본 보관 정책이 적용된다. 자체 서버가 사진을 저장하지 않는다는 이유로 전체 처리를 일시적 처리라고 신고하지 않는다. 이용 제한용 식별자·집계는 별도 DB에 저장한다.

| 데이터 | 현재 처리 | 신고 방향 |
| --- | --- | --- |
| 사진 | 사용자가 선택한 사진을 Cloudflare·Anthropic에 전송 | 사진 수집 있음, 선택 사항, 앱 기능 목적, 전체 파이프라인은 일시적 처리로 보지 않음 |
| 추출된 SSID·비밀번호 | 서버·AI 처리 후 앱 메모리에 보관 | 텍스트 데이터도 누락하지 않음. 기타 사용자 생성 콘텐츠 등 실제 Console 분류와 대조해 포함. 공개 카페 SSID만으로 개인 ID라고 단정하지 않음 |
| 설치·요청 ID 및 이용 횟수 | 임의 설치 ID, 서버의 해시 ID와 요청 시각·횟수 집계 | 기기 또는 기타 ID 등 실제 Console 분류에 포함. 부정 이용 방지·보안·서비스 제공 목적, 사진 기능에 필요 |
| Play Integrity | Google에 앱·기기 검증 요청, 서버에서 라이선스·무결성 판정 | Google의 데이터 처리 안내를 반영해 신고. 자체 DB에는 토큰·판정 원문 미저장 |
| IP | Cloudflare 접속 및 동일 IP 요청 제한 | 부정 이용 방지·보안 목적. IP의 실제 보관·식별 용도에 맞춰 기기 또는 기타 ID 분류 검토. 위치를 추론하면 위치 신고도 필요 |
| 서버 오류·성능 | 요청 URL 자동 로그는 끄고 오류 상태만 기록 | 기기 진단 SDK는 없음. Cloudflare 인프라 처리까지 확인해 진단 수집 여부 확정 |
| QR | 기기 내 해석 | 이 동작만으로 서버 수집 발생하지 않음 |
| 주변 와이파이 목록·위치 | Android 11~12 위치 권한 또는 Android 13+ 근처 기기 권한으로 SSID·보안 방식·신호 세기를 기기 안에서만 비교 | 기기 밖으로 보내지 않으므로 위치 수집으로 신고하지 않음. 서버 전송이나 위치 추정을 추가하면 위치 신고 필요 |
| 사진 전송 동의 여부 | 고지 문구 지문을 기기 보안 저장소에 보관 | 기기 밖으로 보내지 않아 수집 아님 |
| 카카오톡 등 공유 | 사용자 요청으로 선택한 외부 앱에 전달 | 사용자 주도 공유 예외 조건을 확인. 공개 게시 서버 운영으로 신고하지 않음 |

Cloudflare와 Anthropic이 개발자를 대신해 처리하는 서비스 제공자에 해당하면 Google의 데이터 “공유” 신고 예외가 적용될 수 있다. 제공자의 계약·설정을 확인해야 하며, 이 예외와 무관하게 개인정보처리방침에는 전송 대상을 공개한다. HTTPS 전송 암호화는 사용한다. 개인정보 문의 창구를 마련하되, 운영자가 수행할 수 없는 즉시 삭제나 제공자 보관 예외까지 삭제 보장한다고 답하지 않는다.

공식 기준: [데이터 보안 신고 정의와 분류](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en-GB), [Anthropic API 보관](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data), [Cloudflare Workers 로그 보관](https://developers.cloudflare.com/workers/observability/logs/workers-logs/).

## 스토어 등록 초안

- 앱 이름: **WiFi Please**
- 카테고리 제안: 도구
- 짧은 설명: **와이파이 안내문을 찍고, QR로 읽고, 친구에게 간편하게 공유하세요.**
- 아이콘: `assets/images/play-store-icon.png` (512×512)
- 기능 그래픽: `assets/store/feature-graphic.png` (1024×500, 불투명 PNG)
- 개인정보 URL: `https://wifi-please-server.snapfi.workers.dev/privacy` (운영자 정보 입력 및 배포 후 사용)
- 문의 이메일: `shared/privacy.json`의 실제 주소 입력 필요

상세 설명:

> 카페에서 와이파이 비밀번호를 옮겨 적지 마세요. WiFi Please는 안내문 사진에서 와이파이 이름과 비밀번호를 읽고 Android의 네트워크 저장 창을 열어줍니다.
>
> 안내문을 촬영하거나 저장된 사진을 선택할 수 있어요. 와이파이 QR은 카메라로 비추기만 하면 기기 안에서 읽습니다. 읽은 정보는 시스템 공유 창에서 카카오톡 등으로 보내거나 QR과 큰 비밀번호로 보여줄 수 있어요.
>
> 사진 인식에는 인터넷과 외부 AI 처리가 필요합니다. 사진 속 내용은 Cloudflare를 거쳐 Anthropic에 전달되며 전송 전에 안내하고 동의받습니다. 안내문만 담아주세요.
>
> Android 11 이상을 지원합니다. 시스템에서 네트워크 저장을 승인해야 하며 실제 연결 여부는 네트워크 상태와 기기 설정에 따라 달라집니다. 별도 웹 로그인이 필요한 네트워크는 추가 로그인이 필요할 수 있습니다. 이용 권한이 있는 네트워크만 연결하고 공유해 주세요.

스크린샷은 최종 앱의 실제 촬영 화면, 공유 화면, QR 화면에서 가상 테스트 네트워크만 사용해 캡처한다. 실제 비밀번호·사람 얼굴·개인 공간을 포함하지 않는다. 최소 2장, JPEG 또는 알파 없는 PNG, 최소 변 320px·최대 변 3840px·가로세로 비율 2:1 이내. 권장 노출 기준의 4장·1080px 조건과 최소 등록 조건을 구분한다. [스토어 이미지 기준](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-en)

## 심사자에게 제공할 앱 접근 안내

로그인이나 회원가입은 필요하지 않습니다. 카메라 권한은 QR 인식과 촬영에 사용하며, 거부한 상태에서도 시스템 사진 선택기를 사용할 수 있습니다. 사진 인식 전 외부 AI 전송에 동의해야 합니다(설치당 한 번). 사진으로 읽은 와이파이 이름을 주변 실제 네트워크 이름과 맞추기 위해 처음 한 번 이유를 안내한 뒤 근처 기기 권한(Android 12 이하는 위치 권한)을 요청하며, 거부해도 연결 창은 열립니다. QR 인식은 인터넷 없이 동작합니다. 촬영 화면의 "내 와이파이 공유"는 Android 설정의 기본 QR 공유 방법을 안내하고 와이파이 설정을 엽니다.

검사용 네트워크를 준비한 뒤 안내문에 SSID와 비밀번호를 적어 촬영하거나 해당 네트워크의 Wi-Fi QR을 비추세요. 안내문에는 다른 개인 정보를 담지 않아야 합니다. 인식 뒤 Android의 네트워크 저장 창이 열리고, 저장 또는 취소하면 공유 화면으로 이동합니다. 저장은 연결 성공 보장이 아닙니다. 서버 오류나 인식 실패에는 복구 안내가 표시됩니다.

## 제출 전에 남은 순서

1. 공개 개발자명·문의 이메일을 `shared/privacy.json`에 입력한다. 배포 국가, 개인정보 요청 처리 방법 및 제공자 계약 조건을 운영자가 확인한다.
2. [사진 인식 보호 설정](usage-capacity.md#google-설정과-활성화-순서)의 Play Console 연결과 서버 인증을 준비하고 앱·서버 배포 순서를 맞춘다. 앱과 웹의 정책 내용이 일치하는지 확인한 뒤 Worker를 배포한다. `/privacy`, `/terms`가 로그인 없이 HTTP 200으로 열리는지 확인한다. 현재 연락처가 비어 있으면 HTTP 503 초안으로 제공한다.
3. `npm run check:release`를 실행한다. 이 검사는 누락된 연락처와 Play Cloud 프로젝트 번호를 검사하며 심사 적합성 전체를 보증하지 않는다. EAS production 빌드에도 같은 검사를 적용했다.
4. EAS의 **production** 환경에 `EXPO_PUBLIC_SCAN_API_URL`과 `EXPO_PUBLIC_PLAY_CLOUD_PROJECT_NUMBER`를 등록한다. preview에만 넣은 값은 production 등록을 대신하지 않는다.
5. `npx eas-cli@latest build --profile production --platform android`로 서명된 AAB를 만든다. 이 작업에서는 EAS 빌드를 실행하지 않았다.
6. Google Play에서 설치한 내부 테스트 앱으로 앱 검증 성공·실패 및 이용 한도 초기화를 확인한다. 설치·시작·카메라 허용/거부·사진 선택 취소·전송 동의/취소·오프라인 QR·오인식·429/503·재시도·백그라운드 복귀·저장/취소·카카오톡 공유·복사·QR 수신을 확인한다.
7. Android 11과 최신 Android, 16KB 환경 및 글꼴 확대 환경에서 확인한다. Play 사전 출시 보고서를 확인하고 필요하면 실제 지원 기기를 추가한다. 에뮬레이터는 별도 요청 없이는 설치하지 않는다.
8. 최종 AAB의 모든 ABI와 Play 생성 APK의 16KB 정렬, 서명, 권한, debug 비활성 상태를 확인한다.
9. 실제 스크린샷·스토어 설명·데이터 보안·광고·연령·등급·앱 접근 및 Console 공통 신고를 입력한다. 개인 계정이면 해당 비공개 테스트와 프로덕션 접근 신청을 마친다.
10. 배포 국가와 심사 제출 내용을 검토한 뒤 Google Play에 제출한다.

개발자 계정 최초 등록비는 현재 US$25 일회성이며 앱 서버 운영 요금과 별개다. [계정 등록 안내](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)

## 의존성 보안 검토

2026-10-09 `npm audit --omit=dev` 결과 서버는 보고된 취약점 0개, 앱 설치 트리는 상위 의존성 전파를 포함해 39개(높음 26, 보통 13)다. 변경 전 앱 설치 트리는 42개였다. 설치 트리에는 Expo 빌드 도구와 React Native의 테스트 도구도 포함되므로 숫자를 APK의 직접 취약점 수로 해석하지 않는다.

- **앱 실행 경로 수정**: Expo Router → query-string → decode-uri-component의 URL 디코딩 서비스 거부 취약점에 공식 0.5.0 수정 코드를 적용했다. `vendor/decode-uri-component/`의 CommonJS 호환 사본을 직접 의존성과 override로 고정했다. ESM 전용 내보내기만 바꾸고, 대용량 입력 테스트에서 확인한 동적 정규식 오류를 문자열 치환으로 보완했다. 원본 라이선스·소스 해시·변경 이유는 해당 폴더 README에 있다. 로컬 사본이므로 audit 경고 감소만으로 수정 여부를 판단하지 않고 원본 대조와 회귀 테스트도 수행했다. [보안 공지](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [공식 수정 코드](https://github.com/SamVerschueren/decode-uri-component/tree/v0.5.0)
- **방어 유지**: 네이티브 외부 링크는 2,048자 이내의 허용 화면으로만 정규화하고 쿼리를 제거한다. 실제 query-string 및 Router의 URL 해석·직렬화, 잘못된 UTF-8, 30만 자 입력을 Vitest로 검증했다. 정상 한국어·이모지·쿼리 처리를 보존한다.
- **남은 설치 도구 경고**: braces, node-forge는 빌드·개발 도구, sprintf-js는 테스트 도구, uuid 7은 xcode 프로젝트 생성 경로다. 생성된 Android release Metro 소스맵의 1,633개 모듈을 audit 설치 경로와 대조한 결과, 이 네 패키지의 직접 취약점 코드는 번들에 포함되지 않았다. Expo 내부의 `expo-modules-core/src/uuid/`는 별도 구현으로 npm uuid 7과 구분했다. [braces 공지](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge 공지](https://github.com/advisories/GHSA-86w9-cpqp-85rv), [uuid 공지](https://github.com/advisories/GHSA-w5hq-g745-h8pq)

재검사 방법:

```bash
npm audit --omit=dev --json > /tmp/wifi-please-audit.json
node scripts/check-runtime-dependencies.mjs \
  /tmp/wifi-please-audit.json \
  android/app/build/generated/sourcemaps/react/release/index.android.bundle.map
```

`npm audit`는 경고가 있으면 종료 코드 1을 반환하지만 JSON 파일은 생성한다. 위 경로의 소스맵은 release 빌드 후 존재한다. 검사기는 audit에 직접 보고된 JS 패키지가 소스맵에 있으면 실패한다. 이 검토는 미보고 취약점·네이티브 바이너리의 전체 보안 인증을 대신하지 않는다. 남은 빌드 도구 경고는 SDK 업데이트 시 재검토한다. SDK 57 조합을 깨뜨리는 `npm audit fix --force`는 적용하지 않았다.

## 검증 결과와 16KB 판정 정정

기존의 “외부 바이너리 14개 수정 필요” 판단은 잘못됐다. 이전 스크립트는 RELRO 끝 주소가 16KB 경계가 아니면 무조건 실패시켰다. Android Studio의 공식 검사는 RELRO가 LOAD 시작·끝과 일치하거나 동일한 실제 섹션 전체를 보호하는 경우도 허용한다. Hermes·React Native의 해당 바이너리는 이 조건에 해당한다. [Android Studio 공식 검사 구현](https://android.googlesource.com/platform/tools/base/+/7765a1e4385997e1919311925a88cbd12218f818/sdk-common/src/main/java/com/android/ide/common/pagealign/PageAlignUtils.kt)

`scripts/check-android-apk.py`를 이 기준에 맞춰 수정했다. 섹션 정보가 없는 경우에는 빈 목록끼리 같다는 이유로 통과시키지 않는다. 실제 4KB LOAD, 잘못된 RELRO 시작·끝, 다음 LOAD 침범은 계속 실패시킨다. 이 조건들을 Vitest에서 실제 Python 검사기에 전달해 검증한다. 외부 ELF 바이너리를 수정하거나 호환 모드로 우회하지 않았다. 기존 로컬 CMake의 16KB 링커 옵션은 유지했다.

2026-10-09 자동 검증:

- Vitest 116개, Expo lint, 앱·서버 TypeScript 통과.
- Expo Doctor 21개 검사 통과, package-lock의 `npm ci --dry-run` 검사 통과.
- 실제 Android release Metro 번들에 수정된 URL 디코더 포함, audit의 나머지 직접 취약점 패키지는 미포함.
- 로컬 `:app:assembleRelease :app:bundleRelease` 성공. arm64-v8a, armeabi-v7a, x86, x86_64에 각각 네이티브 라이브러리 27개 포함.
- APK와 AAB의 arm64-v8a·x86_64 라이브러리 54개 모두 LOAD·RELRO 검사 통과. 32비트 ABI는 빌드에 포함하며 16KB ELF 검사 대상에서는 제외한다.
- 직접 생성한 APK의 `zipalign -c -P 16 4` 통과. AAB BundleConfig는 `PAGE_ALIGNMENT_16K`.
- 공식 bundletool 1.18.3으로 AAB에서 생성한 universal APK도 54개 ELF 및 ZIP 정렬 통과. 이 변환 APK는 정렬 검사용 미서명 파일이다.
- 최종 manifest의 minSdk 30, targetSdk 36, debuggable false, allowBackup false 확인.

빌드 산출물의 정적 검사는 실제 16KB 기기의 실행 검증을 대신하지 않는다. 실제 기기와 Play 사전 출시 검사는 제출 단계에서 별도로 확인한다. 로컬 기본 debug 키를 사용한 release 빌드는 검사용이며 Play 제출 서명본은 아니다.

재검사 명령:

```bash
python3 scripts/check-android-apk.py \
  android/app/build/outputs/apk/release/app-release.apk \
  --zipalign "$ANDROID_HOME/build-tools/36.0.0/zipalign"

python3 scripts/check-android-apk.py \
  android/app/build/outputs/bundle/release/app-release.aab --aab
```

AAB 검사는 내부 ELF만 확인한다. AAB의 BundleConfig가 16KB 정렬을 요청하는지와 bundletool로 생성한 APK의 ZIP 정렬도 함께 확인한다. [Google 16KB 가이드](https://developer.android.com/guide/practices/page-sizes), [bundletool](https://developer.android.com/tools/bundletool)
