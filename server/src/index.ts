// Snapfi 프록시 서버
// 앱이 보낸 와이파이 안내문 사진을 Claude Haiku 4.5에 보내고, 와이파이 이름과 비밀번호만 돌려준다.
// API 키는 이 서버에만 있고 앱에는 없다.

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

// wrangler secret으로 넣는 값은 wrangler.jsonc에 없어서 직접 타입을 붙인다.
type AppEnv = Env & { ANTHROPIC_API_KEY: string };

const MODEL = 'claude-haiku-4-5';

// 앱에서 긴 쪽 1024px로 줄여 보내므로 보통 수백 KB다. 그보다 훨씬 크면 거절한다.
const MAX_IMAGE_BASE64_LENGTH = 4 * 1024 * 1024;
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

const PROMPT = `This photo shows a Wi-Fi notice from a restaurant or cafe.
Extract the Wi-Fi network name (SSID) and password exactly as written, keeping case, symbols, and spacing.
- If several networks are listed, pick the first one meant for customers.
- If the notice says there is no password, return an empty string for password.
- If a value is not visible or you are not sure, return null for it. Do not guess.`;

export default {
	async fetch(request, env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname !== '/scan') return json({ error: 'not_found' }, 404);
		if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

		// 같은 IP에서 너무 자주 부르면 막는다. (요금 폭탄 방지)
		const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
		const { success } = await env.SCAN_RATE_LIMITER.limit({ key: ip });
		if (!success) return json({ error: 'rate_limited' }, 429);

		// 요청 본문 검사: 사진이 없거나 너무 크면 Claude를 부르지 않는다.
		const body = ScanRequest.safeParse(await request.json().catch(() => null));
		if (!body.success) return json({ error: 'invalid_request' }, 400);

		const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

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
			throw error;
		}
	},
} satisfies ExportedHandler<AppEnv>;

function json(data: unknown, status: number) {
	return Response.json(data, { status });
}
