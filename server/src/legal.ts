import privacy from '../../shared/privacy.json';
import terms from '../../shared/terms.json';

// 공통 정책 원문을 로그인이나 외부 리소스가 필요 없는 공개 HTML로 제공한다.
export function legalResponse(pathname: string): Response | undefined {
  if (pathname !== '/privacy' && pathname !== '/terms') return;
  const ready = !!privacy.developerName.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacy.contactEmail);
  const document = pathname === '/privacy' ? { ...privacy, title: '개인정보처리방침' } : terms;
  const body = document.sections.map(section => `<section><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.text)}</p></section>`).join('');
  const links = privacy.links.map(link => `<p><a href="${escapeHtml(link.url)}">${escapeHtml(link.title)}</a></p>`).join('');
  const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WiFi Please ${document.title}</title><style>body{max-width:720px;margin:48px auto;padding:0 24px;font:16px/1.8 system-ui,sans-serif;color:#171717;background:#fff}h1{font-size:28px}h2{font-size:20px;margin-top:32px}a{color:#1a73e8}footer{margin-top:40px}</style><main><h1>WiFi Please ${document.title}</h1><p>시행일: ${escapeHtml(document.updatedAt)}</p>${ready ? '' : '<p>공개 준비 중입니다. 운영자 정보가 확정되지 않은 초안입니다.</p>'}${body}<footer><p>운영자: ${escapeHtml(privacy.developerName || '등록 전')}<br>문의: ${escapeHtml(privacy.contactEmail || '등록 전')}</p>${links}<a href="/privacy">개인정보처리방침</a> · <a href="/terms">서비스 이용약관</a></footer></main></html>`;
  return new Response(html, { status: ready ? 200 : 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' } });
}

// 연락처나 정책 문구가 HTML로 실행되지 않도록 예약 문자를 이스케이프한다.
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
