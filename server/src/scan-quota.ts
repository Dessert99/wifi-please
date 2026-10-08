import type { ScanBlock } from '../../shared/scan-contract';

type QuotaEnv = { SCAN_INSTALL_DAILY?: string; SCAN_INSTALL_MINUTE?: string; SCAN_GLOBAL_DAILY?: string; SCAN_GLOBAL_MONTHLY?: string };
type Reservation = { installation: string; requestId: string };
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const LEASE_MS = 60000;
type Attempt = { request_id: string; started_at: number };

// 하나의 전역 객체에서 설치별 한도와 전체 예산을 같은 트랜잭션으로 선점한다.
export class ScanQuota {
  constructor(private readonly state: DurableObjectState, private readonly env: QuotaEnv) {
    state.storage.sql.exec(`CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL)`);
    state.storage.sql.exec(`CREATE INDEX IF NOT EXISTS counters_reset ON counters(reset_at)`);
    state.storage.sql.exec(`CREATE TABLE IF NOT EXISTS attempts (request_id TEXT PRIMARY KEY, installation TEXT NOT NULL, started_at INTEGER NOT NULL, finished INTEGER NOT NULL DEFAULT 0)`);
    state.storage.sql.exec(`CREATE INDEX IF NOT EXISTS attempts_installation ON attempts(installation, started_at)`);
    state.storage.sql.exec(`CREATE INDEX IF NOT EXISTS attempts_started ON attempts(started_at)`);
  }

  // 공개 Worker에서만 접근하는 내부 예약·완료 요청을 처리한다.
  async fetch(request: Request): Promise<Response> {
    const data = await request.json<Reservation>();
    if (!/^[a-f0-9]{64}$/.test(data.installation) || !/^[a-f0-9-]{36}$/.test(data.requestId)) return Response.json({}, { status: 400 });
    if (new URL(request.url).pathname === '/finish') {
      this.state.storage.sql.exec('UPDATE attempts SET finished = 1 WHERE request_id = ? AND installation = ?', data.requestId, data.installation);
      return Response.json({ ok: true });
    }
    // 마지막 요청 이후에도 식별 정보가 남지 않도록 정기 삭제를 예약한다.
    if (await this.state.storage.getAlarm() === null) await this.state.storage.setAlarm(Date.now() + HOUR);
    const result = this.state.storage.transactionSync(() => this.reserve(data, Date.now()));
    return Response.json(result, { status: 'error' in result ? 429 : 200 });
  }

  // 종료 시각을 지난 집계와 24시간이 지난 요청 식별자를 지운다.
  async alarm() {
    const now = Date.now();
    this.cleanup(now);
    const [{ count }] = this.state.storage.sql.exec<{ count: number }>('SELECT (SELECT COUNT(*) FROM counters) + (SELECT COUNT(*) FROM attempts) AS count').toArray();
    if (count > 0) await this.state.storage.setAlarm(now + HOUR);
  }

  // 한국 시각 자정과 월초를 공통 초기화 기준으로 사용한다.
  private reserve(data: Reservation, now: number): ScanBlock | { remaining: number; resetAt: number } {
    const limits = [this.env.SCAN_INSTALL_DAILY ?? '10', this.env.SCAN_INSTALL_MINUTE ?? '3', this.env.SCAN_GLOBAL_DAILY ?? '300', this.env.SCAN_GLOBAL_MONTHLY ?? '3000'].map(Number);
    if (limits.some(value => !Number.isSafeInteger(value) || value <= 0)) throw new Error('잘못된 인식 한도 설정');
    this.cleanup(now);
    const sql = this.state.storage.sql;
    if (sql.exec('SELECT request_id FROM attempts WHERE request_id = ?', data.requestId).toArray().length) return { error: 'duplicate_request' };
    const running = sql.exec<Attempt>('SELECT request_id, started_at FROM attempts WHERE installation = ? AND finished = 0 AND started_at > ? ORDER BY started_at LIMIT 1', data.installation, now - LEASE_MS).toArray()[0];
    if (running) return { error: 'request_in_progress', retryAt: running.started_at + LEASE_MS };
    const local = new Date(now + 9 * HOUR);
    const dayReset = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - 9 * HOUR;
    const monthReset = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - 9 * HOUR;
    const counters = [
      { key: `install:${data.installation}`, limit: limits[0], reset: dayReset, error: 'daily_limit' },
      { key: 'global:day', limit: limits[2], reset: dayReset, error: 'service_daily_limit' },
      { key: 'global:month', limit: limits[3], reset: monthReset, error: 'service_monthly_limit' },
    ] as const;
    const values = counters.map(counter => sql.exec<{ count: number }>('SELECT count FROM counters WHERE key = ?', counter.key).toArray()[0]?.count ?? 0);
    // 여러 한도가 겹치면 가장 늦게 풀리는 제한의 시각을 안내한다.
    const blocked = counters.filter((counter, i) => values[i] >= counter.limit).sort((left, right) => right.reset - left.reset)[0];
    if (blocked) return { error: blocked.error, retryAt: blocked.reset };
    // 분 경계 직전·직후의 연속 호출도 막도록 최근 60초를 센다.
    const recent = sql.exec<Attempt>('SELECT request_id, started_at FROM attempts WHERE installation = ? AND started_at > ? ORDER BY started_at', data.installation, now - 60000).toArray();
    if (recent.length >= limits[1]) return { error: 'rate_limited', retryAt: recent[recent.length - limits[1]].started_at + 60000 };
    counters.forEach(counter => sql.exec('INSERT INTO counters (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1', counter.key, counter.reset));
    sql.exec('INSERT INTO attempts (request_id, installation, started_at) VALUES (?, ?, ?)', data.requestId, data.installation, now);
    return { remaining: limits[0] - values[0] - 1, resetAt: dayReset };
  }

  // 요청 시에도 만료 자료를 정리해 알람 지연이 한도에 영향을 주지 않게 한다.
  private cleanup(now: number) {
    this.state.storage.sql.exec('DELETE FROM counters WHERE reset_at <= ?', now);
    this.state.storage.sql.exec('DELETE FROM attempts WHERE started_at <= ?', now - DAY);
  }
}
