// WiFi Please 프록시 서버
// 앱이 보낸 와이파이 안내문 사진을 Claude Haiku 4.5에 보내고, 와이파이 이름과 비밀번호만 돌려준다.
// API 키는 이 서버에만 있고 앱에는 없다.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { legalResponse } from './legal';
import { scanRequestContent } from '../../shared/scan-contract';
import { IntegrityError, verifyIntegrity, type IntegrityEnv } from './play-integrity';
export { ScanQuota } from './scan-quota';

// wrangler secret으로 넣는 값은 wrangler.jsonc에 없어서 직접 타입을 붙인다.
type AppEnv = Env & IntegrityEnv & { ANTHROPIC_API_KEY: string };

const MODEL = 'claude-haiku-4-5';

// 앱에서 긴 쪽 1024px로 줄여 보내므로 보통 수백 KB다. 그보다 훨씬 크면 거절한다.
const MAX_IMAGE_BASE64_LENGTH = 4 * 1024 * 1024;
const BODY_TOO_LARGE = Symbol('body_too_large');
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// 앱이 보내는 요청 형식
const ScanRequest = z.object({
	image: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH),
	mediaType: z.enum(MEDIA_TYPES).default('image/jpeg'),
	installationId: z.string().uuid(),
	requestId: z.string().uuid(),
	issuedAt: z.number().int().positive(),
});

// Claude가 돌려줄 답의 형식 (이 형식으로만 답하도록 고정한다)
const WifiResult = z.object({
	ssid: z.string().nullable(),
	password: z.string().nullable(),
});

const PROMPT = `식당이나 카페의 와이파이 안내문에서 네트워크 이름(SSID)과 비밀번호를 추출하세요.
대소문자, 기호, 공백을 안내문에 적힌 그대로 보존하세요.
- 여러 네트워크가 있고 사용할 네트워크 하나를 명확히 정할 수 없다면 두 값 모두 null을 반환하세요.
- 비밀번호가 없다고 명시된 경우에만 password를 빈 문자열로 반환하세요.
- 보이지 않거나 확신할 수 없는 값은 null을 반환하고 추측하지 마세요.`;

export default {
	// 사진 인식 요청을 검증한 뒤 AI에 전달하고 앱이 사용할 결과만 반환한다.
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		if (request.method === 'GET' || request.method === 'HEAD') {
			const legal = legalResponse(url.pathname);
			if (legal) return request.method === 'HEAD' ? new Response(null, legal) : legal;
		}
		if (url.pathname !== '/scan') return json({ error: 'not_found' }, 404);
		if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

		// 같은 IP의 과도한 요청을 제한하며 전체 비용 상한을 보장하지는 않는다.
		const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
		try {
			const { success } = await env.SCAN_RATE_LIMITER.limit({ key: ip });
			if (!success) return json({ error: 'rate_limited', retryAt: Date.now() + 60000 }, 429);
		} catch { return json({ error: 'quota_unavailable' }, 503); }

		// 요청 본문 검사: 사진이 없거나 너무 크면 Claude를 부르지 않는다.
		const raw = await readLimitedBody(request, MAX_IMAGE_BASE64_LENGTH + 2048);
		if (raw === BODY_TOO_LARGE) return json({ error: 'request_too_large' }, 413);
		const body = ScanRequest.safeParse(raw);
		if (!body.success) return json({ error: 'invalid_request' }, 400);

		if (!env.ANTHROPIC_API_KEY) return json({ error: 'unavailable' }, 503);
		if (Date.now() - body.data.issuedAt > 300000 || body.data.issuedAt - Date.now() > 30000) return json({ error: 'request_expired' }, 409);
		try {
			await verifyIntegrity(request, env, await sha256(scanRequestContent(body.data, body.data.mediaType, body.data.image)));
		} catch (error) {
			const reason = error instanceof IntegrityError ? error.reason : 'verification_unavailable';
			return json({ error: reason }, reason === 'verification_unavailable' ? 503 : 403);
		}

		// 설치 식별자는 해시로만 보관하고 모든 지역 요청을 같은 예산 객체로 모은다.
		const reservation = { installation: await sha256(body.data.installationId), requestId: body.data.requestId };
		let quota: DurableObjectStub;
		try {
			quota = env.SCAN_QUOTA.get(env.SCAN_QUOTA.idFromName('scan-budget-v1'));
			const response = await quota.fetch('https://quota/reserve', { method: 'POST', body: JSON.stringify(reservation) });
			const result = await response.json<{ error?: string; retryAt?: number }>();
			if (response.status === 429 && result.error) return json(result, 429);
			if (!response.ok) return json({ error: 'quota_unavailable' }, 503);
		} catch { return json({ error: 'quota_unavailable' }, 503); }

		try {
			const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 25000, maxRetries: 0 });
			const response = await client.messages.parse({
				model: MODEL,
				max_tokens: 256,
				messages: [
					{
						role: 'user',
						content: [
							// 이미지를 글보다 먼저 넣으면 인식이 더 잘 된다. (Claude 문서 권장)
							{ type: 'image', source: { type: 'base64', media_type: body.data.mediaType, data: body.data.image } },
							{ type: 'text', text: PROMPT },
						],
					},
				],
				output_config: { format: zodOutputFormat(WifiResult) },
			});

			// 형식에 맞는 답을 못 받으면 "못 찾음"으로 처리한다.
			const result = response.parsed_output ?? { ssid: null, password: null };
			return json(result, 200);
		} catch (error) {
			// Claude 쪽 오류는 상태 코드만 남기고, 앱에는 자세한 내용을 보내지 않는다.
			if (error instanceof Anthropic.RateLimitError) return json({ error: 'upstream_busy' }, 503);
			if (error instanceof Anthropic.APIError) {
				console.error('Claude API error', error.status);
				return json({ error: 'upstream_error' }, 502);
			}
			return json({ error: 'upstream_error' }, 502);
		} finally {
			// AI 오류도 횟수는 돌려주지 않고 동시 요청 잠금만 해제한다.
			try { await quota.fetch('https://quota/finish', { method: 'POST', body: JSON.stringify(reservation) }); }
			catch { console.error('인식 잠금 해제 지연'); }
		}
	},
} satisfies ExportedHandler<AppEnv>;

// 모든 응답에 지정한 HTTP 상태와 JSON 본문을 적용한다.
function json(data: unknown, status: number) {
	const headers: Record<string, string> = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
	if (data && typeof data === 'object' && 'retryAt' in data && typeof data.retryAt === 'number') headers['Retry-After'] = String(Math.max(1, Math.ceil((data.retryAt - Date.now()) / 1000)));
	return Response.json(data, { status, headers });
}

// 요청 위변조 검사와 설치 식별자 저장에 동일한 SHA-256 인코딩을 사용한다.
async function sha256(value: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Content-Length가 없거나 틀려도 실제 본문 바이트 한도를 넘기면 AI 호출 전에 중단한다.
async function readLimitedBody(request: Request, maximum: number): Promise<unknown> {
	const reader = request.body?.getReader();
	if (!reader) return {};
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maximum) { await reader.cancel(); return BODY_TOO_LARGE; }
			chunks.push(value);
		}
		const bytes = new Uint8Array(size);
		let offset = 0;
		for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
		return JSON.parse(new TextDecoder().decode(bytes));
	} catch { return {}; }
	finally { reader.releaseLock(); }
}
