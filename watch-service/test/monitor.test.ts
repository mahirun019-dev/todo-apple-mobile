import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyChange, detectMeaningfulChange, extractMeaningfulText, inspectRecruitmentContent, normalizeUrl } from '../src/monitor';

test('normalizes public URLs and strips tracking', () => assert.equal(normalizeUrl(' https://EXAMPLE.com/recruit/?utm_source=x#top '), 'https://example.com/recruit/'));
test('rejects unsafe URLs', () => { for (const url of ['javascript:alert(1)', 'http://127.0.0.1/x', 'https://user:pass@example.com']) assert.throws(() => normalizeUrl(url)); });
test('ignores scripts, navigation, analytics and generated timestamps', () => {
  const before = extractMeaningfulText('<nav>エントリー開始</nav><main><p>新卒採用情報</p><p>最終更新: 2026-01-01</p><script>random-id</script></main>', 'official');
  const after = extractMeaningfulText('<nav>説明会予約開始</nav><main><p>新卒採用情報</p><p>最終更新: 2026-02-02</p><script>other-id</script></main>', 'official');
  assert.equal(detectMeaningfulChange(before, after), null);
});
test('detects relevant added lines', () => assert.ok(detectMeaningfulChange('2028年卒 新卒採用\nエントリー受付前', '2028年卒 新卒採用\nエントリー受付中')));
test('classifies at least five recruitment categories', () => {
  assert.equal(classifyChange(['エントリー受付開始']), 'entry_open');
  assert.equal(classifyChange(['説明会の予約開始']), 'briefing_open');
  assert.equal(classifyChange(['インターン募集開始']), 'internship_open');
  assert.equal(classifyChange(['ES締切日を変更']), 'deadline_changed');
  assert.equal(classifyChange(['Webテスト選考フロー']), 'selection_updated');
  assert.equal(classifyChange(['募集要項 初任給']), 'job_info_updated');
  assert.equal(classifyChange(['募集終了']), 'recruitment_closed');
});
test('accepts a concise public recruitment-status page as a valid baseline', () => {
  const result = inspectRecruitmentContent('<main><h1>2027年度 新卒採用</h1><p>現在、募集を終了しております。</p></main>', 'official');
  assert.equal(result.valid, true);
  assert.match(result.highConfidenceLines.join(' '), /募集を終了/);
});
