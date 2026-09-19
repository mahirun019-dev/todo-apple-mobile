import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index';
import type { TargetRow } from '../src/types';

type StoredTarget = TargetRow & { lease_until: string | null };

class MemoryD1 {
  targets = new Map<string, StoredTarget>();
  rowsRead = 0;

  prepare(sql: string) {
    const query = sql.replace(/\s+/g, ' ').trim();
    let values: unknown[] = [];
    const db = this;
    return {
      bind(...args: unknown[]) { values = args; return this; },
      async first<T>() {
        if (query.startsWith('SELECT expires_at FROM sessions')) return { expires_at: new Date(Date.now() + 60_000).toISOString() } as T;
        if (query.includes('WHERE company_id=? AND normalized_url=?')) {
          return [...db.targets.values()].find((row) => row.company_id === values[0] && row.normalized_url === values[1]) as T | undefined || null;
        }
        if (query.includes('WHERE id=?')) return db.targets.get(String(values[0])) as T | undefined || null;
        throw new Error(`Unsupported SELECT: ${query}`);
      },
      async run() {
        if (query.startsWith('INSERT OR IGNORE INTO watch_targets')) {
          const [id, company_id, company_name, source_type, label, url, normalized_url, created_at, updated_at] = values as [string, string, string, StoredTarget['source_type'], string, string, string, string, string];
          const exists = [...db.targets.values()].some((row) => row.company_id === company_id && row.normalized_url === normalized_url);
          if (exists) return { meta: { changes: 0 } };
          db.targets.set(id, { id, company_id, company_name, source_type, label, url, normalized_url, enabled: 1, created_at, updated_at, last_checked_at: null, last_success_at: null, status: 'checking', last_http_status: null, last_hash: null, last_error: null, snapshot: null, lease_until: null });
          return { meta: { changes: 1 } };
        }
        if (query.startsWith("UPDATE watch_targets SET status='checking',last_error=NULL,last_http_status=NULL,lease_until=?")) {
          const [lease, updatedAt, id, now] = values as [string, string, string, string];
          const row = db.targets.get(id);
          if (!row || !row.enabled || (row.lease_until && row.lease_until >= now)) return { meta: { changes: 0 } };
          Object.assign(row, { status: 'checking', last_error: null, lease_until: lease, updated_at: updatedAt });
          return { meta: { changes: 1 } };
        }
        if (query.startsWith("UPDATE watch_targets SET status='active'")) {
          const [last_checked_at, last_success_at, last_http_status, last_hash, snapshot, updated_at, id, lease] = values as [string, string, number, string, string, string, string, string];
          const row = db.targets.get(id);
          if (!row || row.lease_until !== lease || !row.enabled) return { meta: { changes: 0 } };
          Object.assign(row, { status: 'active', last_checked_at, last_success_at, last_http_status, last_hash, snapshot, updated_at, last_error: null, lease_until: null });
          return { meta: { changes: 1 } };
        }
        if (query.startsWith("UPDATE watch_targets SET status='error'")) {
          const [last_checked_at, last_http_status, last_error, updated_at, id, lease] = values as [string, number | null, string, string, string, string];
          const row = db.targets.get(id);
          if (!row || row.lease_until !== lease || !row.enabled) return { meta: { changes: 0 } };
          Object.assign(row, { status: 'error', last_checked_at, last_http_status, last_error, updated_at, lease_until: null });
          return { meta: { changes: 1 } };
        }
        throw new Error(`Unsupported UPDATE: ${query}`);
      },
      async all() { db.rowsRead += 1; return { results: [] }; },
    };
  }
}

async function addTarget(db: MemoryD1, pending: Promise<unknown>[], body: Record<string, string>) {
  const env = { DB: db, WATCH_ACCESS_CODE: 'unused-in-session-auth', ALLOWED_ORIGIN: 'https://careerflow.example' } as unknown as import('../src/types').Env;
  const ctx = { waitUntil(promise: Promise<unknown>) { pending.push(promise); } } as ExecutionContext;
  const request = new Request('https://careerflow-watch.example.workers.dev/api/targets', {
    method: 'POST',
    headers: { authorization: 'Bearer test-session', origin: env.ALLOWED_ORIGIN, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return worker.fetch(request, env, ctx);
}

test('first Mynavi add and duplicate retry keep the same target and deterministic robots result', async () => {
  const db = new MemoryD1();
  const pending: Promise<unknown>[] = [];
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; userAgent: string }> = [];
  globalThis.fetch = (async (input, init) => {
    const url = String(input);
    if (url.startsWith('https://cloudflare-dns.com/')) return new Response(JSON.stringify({ Answer: [{ data: '198.51.100.10' }] }), { headers: { 'content-type': 'application/json' } });
    requests.push({ url, userAgent: new Headers(init?.headers).get('user-agent') || '' });
    if (url.endsWith('/robots.txt')) return new Response('User-agent: CareerFlowWatch\nDisallow: /28/pc/corpinfo/displayPrevEmployment/', { headers: { 'content-type': 'text/plain' } });
    throw new Error('A disallowed target must not fetch the page');
  }) as typeof fetch;
  const rawUrl = 'https://job.mynavi.jp/28/pc/corpinfo/displayPrevEmployment/index/?corpId=292189&recruitingCourseId=27052359';
  const body = { companyId: 'company-test', companyName: 'テスト企業', sourceType: 'mynavi', url: rawUrl };
  try {
    const firstResponse = await addTarget(db, pending, body);
    const first = await firstResponse.json() as { id: string; duplicate: boolean; queued: boolean; status: string };
    await Promise.all(pending.splice(0));
    const firstTarget = [...db.targets.values()][0];
    assert.equal(firstResponse.status, 201);
    assert.equal(first.duplicate, false);
    assert.equal(first.queued, true);
    assert.equal(firstTarget.url, rawUrl);
    assert.equal(firstTarget.normalized_url, rawUrl);
    assert.equal(firstTarget.status, 'error');
    assert.equal(firstTarget.last_error, 'ROBOTS_DISALLOWED');

    const secondResponse = await addTarget(db, pending, body);
    const second = await secondResponse.json() as { id: string; duplicate: boolean; queued: boolean; status: string };
    await Promise.all(pending.splice(0));
    assert.equal(secondResponse.status, 200);
    assert.equal(second.id, first.id);
    assert.equal(second.duplicate, true);
    assert.equal(second.queued, true);
    assert.equal(db.targets.size, 1);
    assert.equal([...db.targets.values()][0].status, 'error');
    assert.equal([...db.targets.values()][0].last_error, 'ROBOTS_DISALLOWED');
    assert.deepEqual(requests.map((entry) => entry.url), [
      'https://job.mynavi.jp/robots.txt',
      'https://job.mynavi.jp/robots.txt',
    ]);
    assert.ok(requests.every((entry) => entry.userAgent.startsWith('CareerFlowWatch/1.0')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('first official recruitment page add resolves to active without a second request', async () => {
  const db = new MemoryD1();
  const pending: Promise<unknown>[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input) => {
    const url = String(input);
    if (url.startsWith('https://cloudflare-dns.com/')) return new Response(JSON.stringify({ Answer: [{ data: '198.51.100.11' }] }), { headers: { 'content-type': 'application/json' } });
    if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nAllow: /', { headers: { 'content-type': 'text/plain' } });
    return new Response('<main><h1>2027年度 新卒採用 募集要項</h1><p>新卒採用の募集情報です。応募資格、募集職種、初任給、勤務地についてご案内します。</p></main>', { headers: { 'content-type': 'text/html; charset=utf-8' } });
  }) as typeof fetch;
  try {
    const response = await addTarget(db, pending, { companyId: 'company-official', companyName: '公式採用企業', sourceType: 'official', url: 'https://recruit.example.com/new-graduate' });
    const created = await response.json() as { id: string; duplicate: boolean; queued: boolean; status: string };
    await Promise.all(pending);
    const target = db.targets.get(created.id)!;
    assert.equal(response.status, 201);
    assert.equal(created.duplicate, false);
    assert.equal(created.queued, true);
    assert.equal(target.status, 'active');
    assert.equal(target.last_http_status, 200);
    assert.ok(target.last_success_at);
    assert.ok(target.last_hash);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
