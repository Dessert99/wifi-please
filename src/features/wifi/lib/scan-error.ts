import type { ScanBlockReason } from '../../../../shared/scan-contract';

// 통신·인식 실패와 서버의 이용 제한을 같은 계약으로 전달한다.
export class ScanError extends Error {
  constructor(readonly reason: 'network' | 'server' | 'unreadable' | ScanBlockReason, readonly retryAt?: number) {
    super(`scan failed: ${reason}`);
  }
}

// 오류 종류에 맞는 설명만 만들고 화면 표시와 버튼 동작은 촬영 훅에 맡긴다.
export function scanBlockNotice(error: ScanError): { title: string; message: string } | null {
  const qr = '\n안내문에 와이파이 QR이 있다면 계속 읽을 수 있어요.';
  const time = error.retryAt ? new Date(error.retryAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : null;
  const reset = time ? `\n${time}(한국 시각)부터 다시 이용할 수 있어요.` : '\n잠시 후 다시 이용해 주세요.';
  switch (error.reason) {
    case 'daily_limit': return { title: '오늘 사진 인식을 모두 사용했어요', message: `이 앱에서 오늘 이용할 수 있는 횟수를 모두 사용했어요.${reset}${qr}` };
    case 'service_daily_limit':
    case 'service_monthly_limit': return { title: '사진 인식을 잠시 쉬고 있어요', message: `서비스 전체 이용 한도에 도달했어요.${reset}${qr}` };
    case 'rate_limited': return { title: '잠시 후 다시 시도해 주세요', message: `짧은 시간에 요청이 많이 들어왔어요.${error.retryAt ? `\n약 ${Math.max(1, Math.ceil((error.retryAt - Date.now()) / 1000))}초 후 다시 시도해 주세요.` : '\n약 1분 후 다시 시도해 주세요.'}${qr}` };
    case 'request_in_progress': return { title: '사진을 읽고 있어요', message: `진행 중인 요청이 있어요. 잠시 후 다시 시도해 주세요.${qr}` };
    case 'duplicate_request': return { title: '이미 전송한 사진이에요', message: `중복 사용을 막기 위해 같은 요청은 다시 읽지 않아요. 결과를 받지 못했다면 새로 촬영해 주세요.${qr}` };
    case 'request_expired': return { title: '사진을 다시 찍어 주세요', message: `요청의 유효 시간이 지났어요. 새로 촬영하거나 사진을 다시 선택해 주세요.${qr}` };
    case 'integrity_required':
    case 'integrity_failed': return { title: '앱 확인이 필요해요', message: `Google Play에서 설치한 최신 앱인지 확인해 주세요. 계속 문제가 생기면 개인정보처리방침의 문의처로 알려주세요.${qr}` };
    case 'verification_unavailable': return { title: '앱을 확인하지 못했어요', message: `인터넷 연결을 확인하고 잠시 후 다시 시도해 주세요. 계속되면 개인정보처리방침의 문의처로 알려주세요.${qr}` };
    case 'quota_unavailable': return { title: '사진 인식을 잠시 사용할 수 없어요', message: `이용 횟수를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.${qr}` };
    default: return null;
  }
}
