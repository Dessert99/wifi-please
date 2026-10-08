import { beforeEach, expect, it, vi } from 'vitest';
import worker from '../src/index';

const ai = vi.hoisted(() => ({ parse: vi.fn(), options: vi.fn() }));
// 유료 API와 Cloudflare 실행 환경만 대체해 실제 요청 검증과 응답을 확인한다.
vi.mock('@anthropic-ai/sdk', () => ({ default: class {
  static APIError = class extends Error {};
  static RateLimitError = class extends Error {};
  messages = { parse: ai.parse };
  constructor(options: unknown) { ai.options(options); }
} }));
const limit = vi.fn();
const quotaFetch = vi.fn();
const env = { ANTHROPIC_API_KEY: '테스트용', SCAN_MODE: 'local', SCAN_RATE_LIMITER: { limit }, SCAN_QUOTA: { idFromName: () => '예산', get: () => ({ fetch: quotaFetch }) } };
const identity = { installationId: 'bc27154d-e6bd-4972-b9e6-e7c1ed3d0399', requestId: '28898d1f-d48b-48b5-9093-8034e38ef78b', issuedAt: Date.now() };

// 외부 호출 없이 요청이 Worker의 실제 fetch 핸들러를 통과하게 한다.
function request(body: unknown, path = '/scan', method = 'POST') {
  return worker.fetch(new Request(`http://localhost${path}`, { method, ...(method === 'POST' ? { body: JSON.stringify(body && typeof body === 'object' ? { ...identity, issuedAt: Date.now(), ...body } : body) } : {}) }), env as never, {} as never);
}

beforeEach(() => {
  limit.mockResolvedValue({ success: true });
  quotaFetch.mockImplementation(async () => Response.json({ remaining: 9, resetAt: Date.now() + 1000 }));
  ai.parse.mockResolvedValue({ parsed_output: { ssid: 'Cafe', password: 'abcdefgh' } });
});

it('잘못된 요청과 과대 본문은 AI를 호출하지 않는다', async () => {
  expect((await request({ image: 123 })).status).toBe(400);
  expect((await request(null)).status).toBe(400);
  expect((await request({ image: 'a'.repeat(4 * 1024 * 1024 + 2048) })).status).toBe(413);
  expect(ai.parse).not.toHaveBeenCalled();
});

it('IP 제한에 걸리면 AI 호출 없이 429를 반환한다', async () => {
  limit.mockResolvedValueOnce({ success: false });
  expect((await request({ image: '사진' })).status).toBe(429);
  expect(ai.parse).not.toHaveBeenCalled();
});

it('비밀번호 응답은 캐시하지 않고 SDK 자동 재시도를 사용하지 않는다', async () => {
  const response = await request({ image: '사진' });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  expect(await response.json()).toEqual({ ssid: 'Cafe', password: 'abcdefgh' });
  expect(ai.options).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0, timeout: 25000 }));
});

it('예상하지 못한 AI 오류 내용에 민감 정보가 있어도 클라이언트에 노출하지 않는다', async () => {
  ai.parse.mockRejectedValueOnce(new Error('사진 원문과 비밀번호'));
  const response = await request({ image: '사진' });
  expect(response.status).toBe(502);
  expect(await response.json()).toEqual({ error: 'upstream_error' });
});

it('약관과 개인정보 페이지는 AI와 요청 제한을 사용하지 않고 내용을 제공한다', async () => {
  for (const path of ['/privacy', '/terms']) {
    const response = await request(null, path, 'GET');
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(await response.text()).toContain('WiFi Please');
  }
  expect(ai.parse).not.toHaveBeenCalled();
  expect(limit).not.toHaveBeenCalled();
});


it('한도 저장소 장애에는 AI를 호출하지 않는다', async () => {
  quotaFetch.mockRejectedValueOnce(new Error('저장소 장애'));
  const response = await request({ image: '사진' });
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: 'quota_unavailable' });
  expect(ai.parse).not.toHaveBeenCalled();
});

it('전체 이용 한도와 재시도 시각을 그대로 전달한다', async () => {
  const retryAt = Date.now() + 3600000;
  quotaFetch.mockResolvedValueOnce(Response.json({ error: 'service_monthly_limit', retryAt }, { status: 429 }));
  const response = await request({ image: '사진' });
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('3600');
  expect(await response.json()).toEqual({ error: 'service_monthly_limit', retryAt });
  expect(ai.parse).not.toHaveBeenCalled();
});

it('AI 오류도 횟수 복구 없이 완료 처리만 요청한다', async () => {
  ai.parse.mockRejectedValueOnce(new Error('시간 초과'));
  expect((await request({ image: '사진' })).status).toBe(502);
  expect(quotaFetch.mock.calls.map(call => call[0])).toEqual(['https://quota/reserve', 'https://quota/finish']);
});

it('공개 주소에서는 로컬 모드로 검증을 우회할 수 없다', async () => {
  const response = await worker.fetch(new Request('https://wifi-please.test/scan', { method: 'POST', body: JSON.stringify({ ...identity, issuedAt: Date.now(), image: '사진' }) }), env as never, {} as never);
  expect(response.status).toBe(503);
  expect(ai.parse).not.toHaveBeenCalled();
  expect(quotaFetch).not.toHaveBeenCalled();
});

it('설치 ID가 없거나 유효 시간이 지난 요청은 과금 전에 거절한다', async () => {
  expect((await request({ image: '사진', installationId: '' })).status).toBe(400);
  expect((await request({ image: '사진', issuedAt: Date.now() - 300001 })).status).toBe(409);
  expect(quotaFetch).not.toHaveBeenCalled();
  expect(ai.parse).not.toHaveBeenCalled();
});
