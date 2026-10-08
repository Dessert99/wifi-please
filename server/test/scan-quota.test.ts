import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ScanQuota } from '../src/scan-quota';

let database: DatabaseSync;
let quota: ScanQuota;
let alarm: number | null;
let env: Record<string, string>;
const installation = 'a'.repeat(64);

// SQLite와 트랜잭션은 실제로 실행하고 Durable Object의 실행 수명만 대체한다.
beforeEach(() => {
  vi.useFakeTimers({ now: Date.UTC(2026, 9, 8, 3) });
  database = new DatabaseSync(':memory:');
  alarm = null;
  env = { SCAN_INSTALL_DAILY: '10', SCAN_INSTALL_MINUTE: '3', SCAN_GLOBAL_DAILY: '300', SCAN_GLOBAL_MONTHLY: '3000' };
  const storage = {
    sql: { exec: (query: string, ...values: (string | number)[]) => ({ toArray: () => database.prepare(query).all(...values) }) },
    getAlarm: async () => alarm,
    setAlarm: async (value: number) => { alarm = value; },
    transactionSync: (callback: () => unknown) => {
      database.exec('BEGIN');
      try { const result = callback(); database.exec('COMMIT'); return result; }
      catch (error) { database.exec('ROLLBACK'); throw error; }
    },
  };
  // SQL exec는 반환값을 읽지 않는 쓰기 쿼리도 즉시 실행해야 한다.
  storage.sql.exec = (query, ...values) => { const rows = database.prepare(query).all(...values); return { toArray: () => rows }; };
  quota = new ScanQuota({ storage } as never, env);
});
afterEach(() => { database.close(); vi.useRealTimers(); });

// 공개 API를 거치지 않는 내부 예약 계약으로 SQLite의 실제 집계를 검사한다.
async function reserve(id = crypto.randomUUID(), install = installation) {
  const data = { requestId: id, installation: install };
  const response = await quota.fetch(new Request('https://quota/reserve', { method: 'POST', body: JSON.stringify(data) }));
  return { response, data, body: await response.json() as { error?: string; remaining?: number; retryAt?: number; resetAt?: number } };
}
async function finish(data: { requestId: string; installation: string }) {
  await quota.fetch(new Request('https://quota/finish', { method: 'POST', body: JSON.stringify(data) }));
}

it('동시에 도착한 같은 설치의 요청 중 하나만 선점하고 중복 ID는 다시 차감하지 않는다', async () => {
  const results = await Promise.all(Array.from({ length: 8 }, () => reserve()));
  expect(results.filter(result => result.response.ok)).toHaveLength(1);
  expect(results.filter(result => result.body.error === 'request_in_progress')).toHaveLength(7);
  const success = results.find(result => result.response.ok)!;
  await finish(success.data);
  expect((await reserve(success.data.requestId)).body.error).toBe('duplicate_request');
  expect((await reserve()).body.remaining).toBe(8);
});

it('최근 60초에 세 번을 허용하며 거절한 요청은 일일 횟수에서 제외한다', async () => {
  for (let i = 0; i < 3; i++) { const result = await reserve(); expect(result.response.ok).toBe(true); await finish(result.data); }
  const blocked = await reserve();
  expect(blocked.body).toEqual({ error: 'rate_limited', retryAt: Date.now() + 60000 });
  vi.advanceTimersByTime(60000);
  expect((await reserve()).body.remaining).toBe(6);
});

it('열 번째 사진 이후에는 일일 제한을 적용하고 한국 시각 자정에 초기화한다', async () => {
  for (let i = 0; i < 10; i++) { const result = await reserve(); await finish(result.data); vi.advanceTimersByTime(61000); }
  expect((await reserve()).body).toEqual({ error: 'daily_limit', retryAt: Date.UTC(2026, 9, 8, 15) });
  vi.setSystemTime(Date.UTC(2026, 9, 8, 15));
  expect((await reserve()).body.remaining).toBe(9);
});

it('설치 식별자를 바꿔도 전체 일간·월간 상한을 넘지 못한다', async () => {
  env.SCAN_GLOBAL_DAILY = '2'; env.SCAN_GLOBAL_MONTHLY = '3';
  const first = await reserve(); await finish(first.data);
  const second = await reserve(crypto.randomUUID(), 'b'.repeat(64)); await finish(second.data);
  expect((await reserve(crypto.randomUUID(), 'c'.repeat(64))).body.error).toBe('service_daily_limit');
  vi.setSystemTime(Date.UTC(2026, 9, 8, 15));
  const third = await reserve(); await finish(third.data);
  expect((await reserve(crypto.randomUUID(), 'd'.repeat(64))).body).toEqual({ error: 'service_monthly_limit', retryAt: Date.UTC(2026, 9, 31, 15) });
  vi.setSystemTime(Date.UTC(2026, 9, 31, 15));
  expect((await reserve()).response.ok).toBe(true);
});

it('여러 설치의 동시 요청에도 전체 상한을 정확히 지킨다', async () => {
  env.SCAN_GLOBAL_DAILY = '2';
  const results = await Promise.all(Array.from({ length: 10 }, (_, i) => reserve(crypto.randomUUID(), i.toString(16).repeat(64))));
  expect(results.filter(result => result.response.ok)).toHaveLength(2);
  expect(results.filter(result => result.body.error === 'service_daily_limit')).toHaveLength(8);
});

it('완료 통지가 유실돼도 잠금은 만료되며 기존 사용 횟수는 유지된다', async () => {
  await reserve();
  vi.advanceTimersByTime(60000);
  expect((await reserve()).body.remaining).toBe(8);
});

it('요청 식별 기록은 24시간 뒤 삭제하고 설치별 집계는 자정 이후 삭제한다', async () => {
  await reserve();
  expect(alarm).not.toBeNull();
  vi.advanceTimersByTime(24 * 3600000 + 1);
  await quota.alarm();
  expect(database.prepare('SELECT * FROM attempts').all()).toHaveLength(0);
  expect(database.prepare("SELECT * FROM counters WHERE key LIKE 'install:%'").all()).toHaveLength(0);
  expect(database.prepare("SELECT count FROM counters WHERE key = 'global:month'").get()).toMatchObject({ count: 1 });
});

it('잘못된 한도 설정은 제한 해제가 아니라 오류로 끝난다', async () => {
  env.SCAN_GLOBAL_DAILY = 'NaN';
  await expect(reserve()).rejects.toThrow('잘못된 인식 한도 설정');
  expect(database.prepare('SELECT * FROM attempts').all()).toHaveLength(0);
});

it('개인·일간·월간 한도가 겹치면 실제로 가장 늦게 풀리는 월간 제한을 안내한다', async () => {
  env.SCAN_INSTALL_DAILY = '1'; env.SCAN_GLOBAL_DAILY = '1'; env.SCAN_GLOBAL_MONTHLY = '1';
  const result = await reserve(); await finish(result.data);
  expect((await reserve()).body).toEqual({ error: 'service_monthly_limit', retryAt: Date.UTC(2026, 9, 31, 15) });
});
