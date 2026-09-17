import { load } from "cheerio";
import robotsParser from "robots-parser";
import type { EventType, SourceType } from "./types";

const RECRUITMENT = /(エントリー|プレエントリー|応募|募集|新卒|採用|説明会|セミナー|予約|インターン|オープン[・\s-]?カンパニー|ES|エントリーシート|提出|締切|適性検査|Web\s*テスト|面接|選考|受付開始|受付終了)/i;
const PRIVATE_HOST = /(^localhost$|\.localhost$|\.local$|\.internal$|^0\.|^10\.|^127\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^192\.168\.|^::1$|^fc|^fd|^fe80)/i;

export function normalizeUrl(input: string): string {
  const url = new URL(input.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL_SCHEME');
  if (url.username || url.password) throw new Error('URL_CREDENTIALS');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('URL_PORT');
  if (PRIVATE_HOST.test(url.hostname) || /^\[.*\]$/.test(url.hostname)) throw new Error('URL_PRIVATE_HOST');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid|yclid)/i.test(key)) url.searchParams.delete(key);
  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

export function extractMeaningfulText(html: string, sourceType: SourceType): string {
  const $ = load(html);
  $('script,style,noscript,svg,canvas,template,nav,footer,aside,[hidden],[aria-hidden="true"],[class*="cookie" i],[class*="banner" i],[class*="breadcrumb" i],[class*="carousel" i],[id*="analytics" i]').remove();
  const preferred = sourceType === 'mynavi' ? $('main, article, [class*="contents" i]').first() : $('main, article').first();
  const root = preferred.length ? preferred : $('body');
  const blockText: string[] = [];
  root.find('h1,h2,h3,h4,h5,p,li,dt,dd,th,td,time').each((_index, element) => { const value = $(element).text(); if (value) blockText.push(value); });
  const lines = (blockText.length ? blockText : [root.text()]).join('\n').normalize('NFKC').split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length >= 2 && line.length <= 600)
    .filter((line) => !/^(最終更新|generated|page generated|アクセス解析)[:：]?\s*\d{4}/i.test(line));
  return [...new Set(lines)].join('\n').slice(0, 100_000);
}

export function detectMeaningfulChange(before: string, after: string) {
  if (!before || before === after) return null;
  const oldLines = new Set(before.split('\n'));
  const newLines = after.split('\n').filter((line) => !oldLines.has(line));
  const relevant = newLines.filter((line) => RECRUITMENT.test(line));
  if (!relevant.length) return null;
  return { added: relevant.slice(0, 8), beforeExcerpt: before.split('\n').filter((line) => RECRUITMENT.test(line)).slice(-4).join('\n'), afterExcerpt: relevant.slice(0, 4).join('\n') };
}

export function classifyChange(lines: string[]): EventType {
  const text = lines.join(' ');
  if (/(募集終了|受付終了|締め切りました|終了しました)/.test(text)) return 'recruitment_closed';
  if (/(締切|提出期限|応募期限).*(変更|延長|追加|まで|日)/.test(text)) return 'deadline_changed';
  if (/(説明会|セミナー).*(受付開始|予約開始|開催)/.test(text)) return 'briefing_open';
  if (/(インターン|オープン[・\s-]?カンパニー).*(募集|受付|予約|開始)/.test(text)) return 'internship_open';
  if (/(エントリー|プレエントリー|応募|ES|エントリーシート).*(受付開始|開始しました|募集中|提出受付)/.test(text)) return 'entry_open';
  if (/(面接|適性検査|Web\s*テスト|選考スケジュール|選考フロー)/i.test(text)) return 'selection_updated';
  if (/(募集要項|職種|初任給|勤務地|応募資格)/.test(text)) return 'job_info_updated';
  return 'other_recruitment_update';
}

export async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function assertPublicDns(hostname: string) {
  const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, { headers: { accept: 'application/dns-json' } });
  if (!response.ok) throw new Error('DNS_CHECK_FAILED');
  const body = await response.json() as { Answer?: Array<{ data: string }> };
  if (!body.Answer?.length || body.Answer.some((x) => PRIVATE_HOST.test(x.data))) throw new Error('URL_PRIVATE_HOST');
}

export async function fetchPage(input: string): Promise<{ url: string; html: string; status: number }> {
  let url = normalizeUrl(input);
  for (let redirects = 0; redirects < 4; redirects += 1) {
    const parsed = new URL(url);
    await assertPublicDns(parsed.hostname);
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const robotsResponse = await fetch(robotsUrl, { signal: AbortSignal.timeout(8_000) });
    if (robotsResponse.ok) {
      const robots = robotsParser(robotsUrl, await robotsResponse.text());
      if (!robots.isAllowed(url, 'CareerFlowWatch/1.0')) throw new Error('ROBOTS_DISALLOWED');
    }
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000), headers: { 'user-agent': 'CareerFlowWatch/1.0 (+public recruitment monitor)', accept: 'text/html,application/xhtml+xml' } });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('REDIRECT_WITHOUT_LOCATION');
      url = normalizeUrl(new URL(location, url).toString());
      continue;
    }
    if (response.status === 401 || response.status === 403) throw new Error('ACCESS_RESTRICTED');
    if (response.status === 429) throw new Error('RATE_LIMITED');
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    if (!(response.headers.get('content-type') || '').includes('text/html')) throw new Error('UNSUPPORTED_CONTENT_TYPE');
    const html = (await response.text()).slice(0, 1_500_000);
    if (/<form[^>]*(?:login|signin)[^>]*>[\s\S]{0,8000}<input[^>]+type=["']password/i.test(html)) throw new Error('LOGIN_REQUIRED');
    return { url, html, status: response.status };
  }
  throw new Error('TOO_MANY_REDIRECTS');
}
