import { classifyChange, detectMeaningfulChange, extractMeaningfulText, fetchPage, normalizeUrl, sha256 } from './monitor';
import type { Env, SourceType, TargetRow } from './types';

const json = (body: unknown, status = 200, origin = '*') => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', vary: 'Origin' } });

async function authenticate(request: Request, env: Env) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const hash = await sha256(token);
  const row = await env.DB.prepare('SELECT expires_at FROM sessions WHERE token_hash=?').bind(hash).first<{ expires_at: string }>();
  return Boolean(row && row.expires_at > new Date().toISOString());
}

async function createSession(request: Request, env: Env, origin: string) {
  const { code } = await request.json<{ code?: string }>();
  if (!code || (await sha256(code)) !== (await sha256(env.WATCH_ACCESS_CODE))) return json({ error: 'AUTH_FAILED' }, 401, origin);
  const token = crypto.randomUUID() + crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 30 * 864e5).toISOString();
  await env.DB.prepare('INSERT INTO sessions(token_hash,expires_at,created_at) VALUES(?,?,?)').bind(await sha256(token), expires, now.toISOString()).run();
  return json({ token, expiresAt: expires }, 201, origin);
}

const titles: Record<string, string> = {
  entry_open: 'エントリー受付が開始された可能性があります', briefing_open: '説明会情報が更新されました', internship_open: 'インターン情報が更新されました', deadline_changed: '締切情報の更新を検出しました', selection_updated: '選考情報の更新を検出しました', job_info_updated: '募集要項の更新を検出しました', recruitment_closed: '募集終了に関する更新を検出しました', other_recruitment_update: '採用情報の更新を検出しました'
};

export async function checkTarget(env: Env, target: TargetRow) {
  const now = new Date().toISOString();
  const lease = new Date(Date.now() + 120_000).toISOString();
  const lock = await env.DB.prepare("UPDATE watch_targets SET status='checking',lease_until=? WHERE id=? AND enabled=1 AND (lease_until IS NULL OR lease_until<?)").bind(lease, target.id, now).run();
  if (!lock.meta.changes) return;
  try {
    const fetched = await fetchPage(target.url);
    const text = extractMeaningfulText(fetched.html, target.source_type);
    if (text.length < 80) throw new Error('INSUFFICIENT_PUBLIC_CONTENT');
    const hash = await sha256(text);
    const change = target.snapshot ? detectMeaningfulChange(target.snapshot, text) : null;
    if (change && hash !== target.last_hash) {
      const type = classifyChange(change.added);
      await env.DB.prepare(`INSERT OR IGNORE INTO watch_events(id,company_id,company_name,watch_target_id,event_type,title,summary,before_excerpt,after_excerpt,detected_at,source_url,source_type,read,content_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0,?)`)
        .bind(crypto.randomUUID(), target.company_id, target.company_name, target.id, type, titles[type], `「${change.added[0]}」という情報が追加または変更されました。`, change.beforeExcerpt, change.afterExcerpt, now, fetched.url, target.source_type, hash).run();
    }
    await env.DB.prepare("UPDATE watch_targets SET status='active',last_checked_at=?,last_success_at=?,last_http_status=?,last_hash=?,last_error=NULL,snapshot=?,lease_until=NULL,updated_at=? WHERE id=? AND enabled=1").bind(now, now, fetched.status, hash, text, now, target.id).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    await env.DB.prepare("UPDATE watch_targets SET status='error',last_checked_at=?,last_error=?,lease_until=NULL,updated_at=? WHERE id=? AND enabled=1").bind(now, message, now, target.id).run();
  }
}

async function scheduled(env: Env) {
  const rows = await env.DB.prepare("SELECT * FROM watch_targets WHERE enabled=1 AND status!='paused' ORDER BY COALESCE(last_checked_at,'') ASC LIMIT 12").all<TargetRow>();
  for (const target of rows.results) await checkTarget(env, target);
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) { ctx.waitUntil(scheduled(env)); },
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin') || '';
    const allowed = origin === env.ALLOWED_ORIGIN || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
    if (origin && !allowed) return json({ error: 'ORIGIN_DENIED' }, 403, 'null');
    if (request.method === 'OPTIONS') return json({}, 204, origin || env.ALLOWED_ORIGIN);
    if (url.pathname === '/api/session' && request.method === 'POST') return createSession(request, env, origin);
    if (!(await authenticate(request, env))) return json({ error: 'UNAUTHORIZED' }, 401, origin);
    if (url.pathname === '/api/targets' && request.method === 'GET') {
      const [targets, events] = await Promise.all([env.DB.prepare('SELECT * FROM watch_targets ORDER BY created_at DESC').all(), env.DB.prepare('SELECT * FROM watch_events ORDER BY detected_at DESC LIMIT 100').all()]);
      return json({ targets: targets.results, events: events.results }, 200, origin);
    }
    if (url.pathname === '/api/targets' && request.method === 'POST') {
      const body = await request.json<{ companyId?: string; companyName?: string; sourceType?: SourceType; label?: string; url?: string }>();
      if (!body.companyId || !body.companyName || !['mynavi','official','other'].includes(body.sourceType || '') || !body.url) return json({ error: 'INVALID_INPUT' }, 400, origin);
      let normalized: string;
      try { normalized = normalizeUrl(body.url); } catch (error) { return json({ error: error instanceof Error ? error.message : 'INVALID_URL' }, 400, origin); }
      const id = crypto.randomUUID(), now = new Date().toISOString();
      try { await env.DB.prepare("INSERT INTO watch_targets(id,company_id,company_name,source_type,label,url,normalized_url,enabled,created_at,updated_at,status) VALUES(?,?,?,?,?,?,?,1,?,?,'checking')").bind(id, body.companyId, body.companyName, body.sourceType, (body.label || '').trim(), normalized, normalized, now, now).run(); }
      catch { return json({ error: 'DUPLICATE_URL' }, 409, origin); }
      const target = await env.DB.prepare('SELECT * FROM watch_targets WHERE id=?').bind(id).first<TargetRow>();
      if (target) ctx.waitUntil(checkTarget(env, target));
      return json({ id }, 201, origin);
    }
    const match = url.pathname.match(/^\/api\/targets\/([^/]+)(?:\/(retry))?$/);
    if (match) {
      const id = match[1];
      if (request.method === 'DELETE') { await env.DB.prepare('DELETE FROM watch_targets WHERE id=?').bind(id).run(); return json({}, 200, origin); }
      if (request.method === 'PATCH') {
        const body = await request.json<{ enabled?: boolean; label?: string; url?: string; sourceType?: SourceType }>();
        const current = await env.DB.prepare('SELECT * FROM watch_targets WHERE id=?').bind(id).first<TargetRow>();
        if (!current) return json({ error: 'NOT_FOUND' }, 404, origin);
        let normalized = current.normalized_url;
        try { if (body.url) normalized = normalizeUrl(body.url); } catch (error) { return json({ error: error instanceof Error ? error.message : 'INVALID_URL' }, 400, origin); }
        await env.DB.prepare('UPDATE watch_targets SET enabled=?,status=?,label=?,url=?,normalized_url=?,source_type=?,updated_at=? WHERE id=?').bind(body.enabled === false ? 0 : 1, body.enabled === false ? 'paused' : 'checking', body.label ?? current.label, normalized, normalized, body.sourceType ?? current.source_type, new Date().toISOString(), id).run();
        return json({}, 200, origin);
      }
      if (request.method === 'POST' && match[2] === 'retry') { const target = await env.DB.prepare('SELECT * FROM watch_targets WHERE id=?').bind(id).first<TargetRow>(); if (target) ctx.waitUntil(checkTarget(env, target)); return json({}, 202, origin); }
    }
    const eventMatch = url.pathname.match(/^\/api\/events\/([^/]+)\/read$/);
    if (eventMatch && request.method === 'POST') { await env.DB.prepare('UPDATE watch_events SET read=1 WHERE id=?').bind(eventMatch[1]).run(); return json({}, 200, origin); }
    return json({ error: 'NOT_FOUND' }, 404, origin);
  }
};
