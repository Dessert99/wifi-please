// 앱과 서버가 같은 요청 내용을 검증하도록 순서와 버전을 고정한다.
export type ScanIdentity = { installationId: string; requestId: string; issuedAt: number };
export function scanRequestContent(identity: ScanIdentity, mediaType: string, image: string) {
  return JSON.stringify(['scan-v1', identity.installationId, identity.requestId, identity.issuedAt, mediaType, image]);
}

export type ScanBlockReason = 'rate_limited' | 'daily_limit' | 'request_in_progress' | 'duplicate_request'
  | 'service_daily_limit' | 'service_monthly_limit' | 'integrity_required' | 'integrity_failed'
  | 'verification_unavailable' | 'quota_unavailable' | 'request_expired';
export type ScanBlock = { error: ScanBlockReason; retryAt?: number };

// 외부 응답을 오류 안내로 사용할 때 알려진 코드만 허용한다.
export function isScanBlockReason(value: unknown): value is ScanBlockReason {
  return typeof value === 'string' && ['rate_limited', 'daily_limit', 'request_in_progress', 'duplicate_request',
    'service_daily_limit', 'service_monthly_limit', 'integrity_required', 'integrity_failed',
    'verification_unavailable', 'quota_unavailable', 'request_expired'].includes(value);
}
