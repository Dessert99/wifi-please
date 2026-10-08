# WiFi Please Google Play 출시 준비

2026년 10월 8일 기준 Android 휴대폰용 앱에 적용되는 요건이다. 사진 인식, 시스템 Wi-Fi 저장, QR, 공유 기능은 출시 범위로 충분하다. 다만 현재는 네이티브 RELRO 정렬 문제, 운영자 연락처와 계정 관련 절차가 남아 있어 즉시 제출 준비 완료 상태는 아니다.

## 적용 요건과 현재 대응

| 항목 | 앱에 적용되는 내용 | 대응과 남은 일 |
| --- | --- | --- |
| 개인정보처리방침 | 모든 앱에 공개 웹 URL 및 앱 내 접근 수단 필요 | `shared/privacy.json`을 앱 `/privacy`와 Worker `/privacy`에서 함께 사용. 개발자명·문의 이메일 입력과 실제 배포 필요 |
| 사진 전송 고지 | 안내문 사진과 인증 정보를 외부 AI가 처리한다는 점을 사전 설명 | 첫 사진 작업 전에 전송 대상·목적·보관·QR 대안을 알리고 동의받음. 취소하면 사진 작업 실행 안 함 |
| 최소 권한 | 일회성 사진 선택은 시스템 선택기 사용 | 카메라만 런타임 요청. 저장소·전체 미디어·마이크·광고 ID·오버레이·진동 권한 제외 |
| 안전한 처리 | 인증 정보의 전송·보관·노출 최소화 | HTTPS, 서버 secret, 메모리 세션, 임시 사진 정리, API 응답 `no-store`, 요청 크기·시간 제한 |
| 외부 링크 입력 | 공개 앱 스킴의 비정상 입력으로 인한 멈춤 방지 | `+native-intent.tsx`에서 길이 제한·화면 허용 목록·쿼리 제거. 계정이나 비밀번호를 링크로 받지 않음 |
| 데이터 보안 신고 | 서버로 보내는 사진은 수집에 해당 | 아래 신고 초안을 실제 제공자 설정과 대조해 Console에 입력 |
| 이용약관 | 모든 앱에 별도 동의 화면이 필수인 것은 아님 | `/terms`에 이용 권한, 공유 범위, AI·연결 한계, 문의·변경 안내 추가. 가입 절차는 추가하지 않음 |
| 계정 삭제 | 앱에서 계정을 만들 수 있는 경우 적용 | 앱 계정·가입 기능이 없어 현재 해당 없음. OS에 저장한 네트워크 삭제 방법은 개인정보 안내에 기재 |
| 목표 API | 신규 휴대폰 앱은 API 36 이상 | Expo SDK 57 기반. 최종 AAB의 targetSdk 재확인 |
| 64비트와 16KB | 네이티브 라이브러리 포함 앱의 호환성 확인 | arm64 LOAD·APK ZIP 정렬 통과, 외부 바이너리 14개의 RELRO 끝 주소 정렬 미통과. 아래 출시 차단 항목 참조 |
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
| 특수 권한·기능 신고 | VPN, 접근성, 전체 파일, 위치, SMS, 알람, 전체 화면 intent 등 | 현재 사용하지 않음. 건강·금융 등 Console 공통 설문은 해당 기능 없음으로 사실대로 답변 |
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

로그인이나 회원가입은 필요하지 않습니다. 카메라 권한은 QR 인식과 촬영에 사용하며, 거부한 상태에서도 시스템 사진 선택기를 사용할 수 있습니다. 사진 인식 전 외부 AI 전송에 동의해야 합니다. QR 인식은 인터넷 없이 동작합니다.

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

`npm audit --omit=dev` 결과 서버는 보고된 취약점 0개, 앱은 상위 의존성 전파를 포함해 42개(높음 26, 보통 16)다. 설치 트리에는 앱에 포함되지 않는 Expo 빌드 도구와 React Native의 테스트 도구도 dependencies로 들어 있으므로 숫자를 APK의 직접 취약점 수로 해석하지 않는다. 반대로 전체가 무해하다고 처리하지도 않는다.

- Expo Router → query-string → decode-uri-component 0.2.2에는 잘못된 URL 디코딩으로 앱이 멈출 수 있는 보고가 있다. 패치 0.5.0은 ESM이라 기존 CommonJS 소비자에 단순 override하면 호환성이 깨질 수 있다. SDK를 강제 변경하는 대신 네이티브 외부 링크를 알려진 짧은 경로로만 정규화해 해당 입력 경로를 완화했다. 네이티브 시작·실행 중 링크를 테스트하며, Expo 의존성 자체의 업데이트 추적은 남는다. 웹 앱을 배포한다면 웹 진입에도 별도 대응해야 한다. [보안 공지](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [Expo 네이티브 링크 처리](https://docs.expo.dev/router/advanced/native-intent/)
- braces, node-forge는 Expo 빌드·개발 도구 경로에 있고 점검 당시 공식 패치 버전이 없다. 개발 서버를 신뢰할 수 없는 네트워크에 공개하지 않으며, SDK 업데이트 때 다시 확인한다. [braces 공지](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge 공지](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
- sprintf-js는 React Native 테스트 프리셋 아래의 빌드·테스트 의존성이다. 프로젝트 테스트 실행 도구는 계속 Vitest다.
- uuid 7은 iOS 프로젝트 생성용 xcode 패키지에서 v4를 호출한다. 보고된 문제는 외부 버퍼를 받는 v3/v5/v6에 관한 것으로 현재 확인한 사용 경로와 다르다. [uuid 공지](https://github.com/advisories/GHSA-w5hq-g745-h8pq)

`npm audit fix --force`가 제시한 Expo 44 또는 React Native 0.72로의 변경은 현재 SDK 57 조합을 깨뜨리므로 적용하지 않았다. 이 검토는 바이너리 전체 보안 인증을 대신하지 않는다.

## 검증 결과와 네이티브 출시 차단 항목

2026-10-08 로컬 검사 결과:

- Vitest 47개 통과, Expo lint·앱 TypeScript·서버 TypeScript 통과.
- Worker dry-run 통과. 로컬 `/privacy`, `/terms`는 연락처 미등록 때문에 의도적으로 503을 반환하며 AI는 호출하지 않음.
- 웹 320×568 및 360×740에서 사진 동의·취소 버튼, 정책 화면과 약관 이동 확인. JS 실행 오류 없음. Android 실기기 검증을 대신하지 않음.
- `:app:assembleRelease -PreactNativeArchitectures=arm64-v8a` 성공. 로컬 기본 debug 키로 서명된 점검용 APK이며 Play 제출용 AAB가 아님.
- 최종 manifest: minSdk 30, targetSdk 36, 백업 비활성. 권한은 CAMERA, INTERNET, ACCESS_NETWORK_STATE 및 앱 내부 서명 권한. 사진 전체 접근·마이크·광고 ID·오버레이·진동 권한 없음.
- arm64 `.so` 27개 모두 LOAD 정렬 16KB 이상, `zipalign -c -P 16 4` 통과. 초기에는 23개의 GNU_RELRO 끝 주소가 어긋났고, config plugin의 링커 설정으로 직접 빌드하는 9개를 해결했다. **외부에서 공급된 바이너리 14개는 여전히 경계와 불일치.**

Google의 현재 문서는 RELRO의 가상 주소와 MemSiz 합도 16KB 경계에 맞아야 한다고 설명한다. 실제 16KB 기기에서의 충돌은 아직 재현하지 않았지만, 이 정적 검사 결과를 호환 통과로 표시하지 않는다. 해결된 파일에는 `libappmodules.so`, `libexpo-modules-core.so`, `libreanimated.so`가 있다. 남은 파일에는 `libhermesvm.so`, `libc++_shared.so`, `libfbjni.so`, `libjsi.so` 등이 있다. 검사 스크립트가 전체 목록을 출력한다. [RELRO 확인과 재빌드 기준](https://developer.android.com/guide/practices/page-sizes#relro-flag)

```bash
python3 scripts/check-android-apk.py \
  android/app/build/outputs/apk/release/app-release.apk \
  --zipalign "$ANDROID_HOME/build-tools/36.0.0/zipalign"
```

현재 SDK 57 호환 패키지 검사는 통과하고 Expo 57.0.27·React Native 0.86.3은 조회한 해당 버전 계열의 최신 패치다. 프로젝트에서 직접 컴파일하는 라이브러리에는 `plugins/with-android-page-size.cjs`를 통해 Google이 제시한 NDK r27 링커의 `max-page-size`와 `common-page-size`를 적용하고 재빌드했다. 그러나 Hermes·React Native 등 **배포된 바이너리 의존성도 함께 교체·재빌드해야 하므로 프로젝트 NDK 설정만 변경해서 해결됐다고 할 수 없다.**

후속 작업은 해당 의존성의 수정된 호환 배포본 확보 또는 검증 가능한 소스 재빌드, 최종 AAB의 전체 ABI 검사, 16KB 실기기와 Play 사전 출시 검사다. ELF 파일을 임의로 수정하거나 호환 모드로 문제를 숨기는 처리는 하지 않았다. 아직 실행하지 않은 x86_64 검사도 제출 전 확인해야 한다.
