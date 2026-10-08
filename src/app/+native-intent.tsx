const routes = new Set(['/', '/privacy', '/terms', '/share', '/qr', '/password']);

// 외부 링크는 알려진 화면으로만 보내고 사용하지 않는 쿼리와 비정상 입력은 라우터에 넘기지 않는다.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (path.length > 2048) return '/';
  try {
    const url = new URL(path, 'wifiplease://app');
    const pathname = url.pathname || `/${url.hostname}`;
    const route = decodeURIComponent(pathname);
    return routes.has(route) ? route : '/';
  } catch { return '/'; }
}
