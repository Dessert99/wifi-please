import { expect, it } from 'vitest';
import { ScanError, scanBlockNotice } from '../lib/scan-error';

it.each(['daily_limit', 'rate_limited', 'request_in_progress', 'duplicate_request', 'service_daily_limit', 'service_monthly_limit', 'integrity_required', 'integrity_failed', 'verification_unavailable', 'quota_unavailable', 'request_expired'] as const)('%s 안내에는 QR 대안을 제공한다', reason => {
  expect(scanBlockNotice(new ScanError(reason))?.message).toContain('와이파이 QR');
});

it('단말 시간대와 무관하게 한국 시각으로 초기화 시점을 표시한다', () => {
  const notice = scanBlockNotice(new ScanError('daily_limit', Date.UTC(2026, 9, 8, 15)));
  expect(notice?.message).toContain('10. 9.');
  expect(notice?.message).toContain('00:00');
  expect(notice?.message).toContain('한국 시각');
});
