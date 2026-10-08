// WiFi Please 프록시 서버
// 앱이 보낸 와이파이 안내문 사진을 Claude Haiku 4.5에 보내고, 와이파이 이름과 비밀번호만 돌려준다.
// API 키는 이 서버에만 있고 앱에는 없다.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { legalResponse } from './legal';

// wrangler secret으로 넣는 값은 wrangler.jsonc에 없어서 직접 타입을 붙인다.
type AppEnv = Env & { ANTHROPIC_API_KEY: string };

const MODEL = 'claude-haiku-4-5';

// 앱에서 긴 쪽 1024px로 줄여 보내므로 보통 수백 KB다. 그보다 훨씬 크면 거절한다.
const MAX_IMAGE_BASE64_LENGTH = 4 * 1024 * 1024;
const BODY_TOO_LARGE = Symbol('body_too_large');
const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

// 앱이 보내는 요청 형식
const ScanRequest = z.object({
	image: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH),
	mediaType: z.enum(MEDIA_TYPES).default('image/jpeg'),
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
		const { success } = await env.SCAN_RATE_LIMITER.limit({ key: ip });
		if (!success) return json({ error: 'rate_limited' }, 429);

		// 요청 본문 검사: 사진이 없거나 너무 크면 Claude를 부르지 않는다.
		const raw = await readLimitedBody(request, MAX_IMAGE_BASE64_LENGTH + 1024);
		if (raw === BODY_TOO_LARGE) return json({ error: 'request_too_large' }, 413);
		const body = ScanRequest.safeParse(raw);
		if (!body.success) return json({ error: 'invalid_request' }, 400);

		if (!env.ANTHROPIC_API_KEY) return json({ error: 'unavailable' }, 503);
		const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 25000, maxRetries: 0 });

		try {
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
		}
	},
} satisfies ExportedHandler<AppEnv>;

// 모든 응답에 지정한 HTTP 상태와 JSON 본문을 적용한다.
function json(data: unknown, status: number) {
	return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
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
