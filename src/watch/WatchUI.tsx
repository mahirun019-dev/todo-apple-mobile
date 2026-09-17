import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Bell, ExternalLink, Eye, MoreHorizontal, Pause, Pencil, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { watchText } from './i18n';
import { companyWatchKey, useWatch } from './WatchProvider';
import type { WatchEvent, WatchSource } from './types';

type Locale = 'ja' | 'zh';
const formatDate = (value: string | null, locale: Locale) => value ? new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';

function targetStatus(target: import('./types').WatchTarget, text: typeof watchText.ja | typeof watchText.zh, locale: Locale) {
  if (!target.enabled) return { tone: 'paused', label: text.paused, detail: '' };
  if (target.status === 'error' || target.last_error) return { tone: 'error', label: text.error, detail: target.last_success_at ? `${text.lastSuccess} ${formatDate(target.last_success_at, locale)}` : text.unchecked };
  if (target.last_success_at) return { tone: 'active', label: text.active, detail: `${text.lastCheck} ${formatDate(target.last_checked_at, locale)}` };
  return { tone: 'checking', label: text.checking, detail: text.unchecked };
}

export function CompanyWatchSection({ company, locale, openSettings, highlightEventId }: { company: { id: string; name: string }; locale: Locale; openSettings(): void; highlightEventId?: string }) {
  const text = watchText[locale], watch = useWatch();
  const [formOpen, setFormOpen] = useState(false), [editingId, setEditingId] = useState<string | null>(null), [sourceType, setSourceType] = useState<WatchSource>('official'), [url, setUrl] = useState(''), [label, setLabel] = useState(''), [message, setMessage] = useState(''), [actionsFor, setActionsFor] = useState<string | null>(null);
  const companyKey = companyWatchKey(company.name);
  const targets = watch.targets.filter((target) => target.company_id === company.id || companyWatchKey(target.company_name) === companyKey);
  const updates = watch.events.filter((event) => event.company_id === company.id || companyWatchKey(event.company_name) === companyKey);
  useEffect(() => {
    if (!highlightEventId || !updates.some((event) => event.id === highlightEventId)) return;
    const element = document.getElementById(`company-watch-update-${highlightEventId}`);
    if (!element) return;
    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element.classList.add('is-highlighted');
    const timeout = window.setTimeout(() => element.classList.remove('is-highlighted'), 1800);
    return () => window.clearTimeout(timeout);
  }, [highlightEventId, updates]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage('');
    try {
      const response = await watch.request(editingId ? `/api/targets/${editingId}` : '/api/targets', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify({ companyId: company.id, companyName: company.name, sourceType, url, label }) });
      if (!response.ok) { const body = await response.json(); setMessage(body.error === 'DUPLICATE_URL' ? text.duplicate : text.invalid); return; }
      setFormOpen(false); setEditingId(null); setUrl(''); setLabel(''); await watch.refresh();
    } catch { setMessage(text.unavailable); }
  };
  const changeEnabled = async (target: import('./types').WatchTarget) => { await watch.request(`/api/targets/${target.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !target.enabled }) }); await watch.refresh(); setActionsFor(null); };
  const remove = async (target: import('./types').WatchTarget) => { await watch.request(`/api/targets/${target.id}`, { method: 'DELETE' }); await watch.refresh(); setActionsFor(null); };
  const edit = (target: import('./types').WatchTarget) => { setEditingId(target.id); setSourceType(target.source_type); setUrl(target.url); setLabel(target.label); setFormOpen(true); setActionsFor(null); };
  const actionTarget = targets.find((target) => target.id === actionsFor);
  return <section id="company-watch" className="company-watch-section detail-section">
    <div className="company-watch-heading"><h2>{text.title}</h2>{watch.authenticated && <button type="button" className="text-button" onClick={() => { setEditingId(null); setSourceType('official'); setUrl(''); setLabel(''); setFormOpen(true); }}><Plus />{text.add}</button>}</div>
    {!watch.configured ? <p className="company-watch-muted">{text.unavailable}</p> : !watch.authenticated ? <div className="company-watch-connect"><p>{text.notConnected}</p><button type="button" className="text-button" onClick={openSettings}>{text.settings}<ExternalLink /></button></div> : targets.length ? <div className="watch-target-list">{targets.map((target) => {
      const status = targetStatus(target, text, locale);
      return <article className="watch-target-item" key={target.id}>
      <div className="watch-target-copy"><strong>{target.label || text[target.source_type]}</strong><a href={target.url} target="_blank" rel="noreferrer" title={target.url}>{new URL(target.url).host}{new URL(target.url).pathname}<ExternalLink /></a><small className={`watch-status ${status.tone}`}>{status.label}{status.detail ? ` · ${status.detail}` : ''}</small>{target.last_error && <small title={target.last_error}>{target.last_error}</small>}</div>
      <div className="watch-target-actions">
        <button className="watch-target-actions-more" title={locale === 'ja' ? '操作' : '操作'} onClick={() => setActionsFor(target.id)}><MoreHorizontal /></button>
        <div className="watch-target-actions-desktop"><button title={text.edit} onClick={() => edit(target)}><Pencil /></button>
        {target.status === 'error' && <button title={text.retry} onClick={async () => { await watch.request(`/api/targets/${target.id}/retry`, { method: 'POST' }); await watch.refresh(); }}><RefreshCw /></button>}
        <button title={target.enabled ? text.pause : text.resume} onClick={() => void changeEnabled(target)}>{target.enabled ? <Pause /> : <Play />}</button>
        <button title={text.remove} className="danger-icon" onClick={() => void remove(target)}><Trash2 /></button></div>
      </div>
    </article>; })}</div> : <div className="company-watch-empty"><Eye /><p>{text.empty}</p><button type="button" onClick={() => setFormOpen(true)}><Plus />{text.add}</button></div>}
    {formOpen && <div className="modal-layer watch-dialog-layer"><button className="modal-backdrop" aria-label={text.cancel} onClick={() => setFormOpen(false)} /><section className="drawer entity-card watch-dialog" role="dialog" aria-modal="true"><header><h2>{text.add}</h2><button className="close-button" onClick={() => setFormOpen(false)} aria-label={text.cancel}><X /></button></header><form onSubmit={submit}><div className="form-grid"><label>{text.source}<select value={sourceType} onChange={(e) => setSourceType(e.target.value as WatchSource)}><option value="mynavi">{text.mynavi}</option><option value="official">{text.official}</option><option value="other">{text.other}</option></select></label><label>{text.url}<input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></label><label>{text.label}<input value={label} onChange={(e) => setLabel(e.target.value)} /></label></div>{message && <p className="form-error">{message}</p>}<footer className="form-actions"><button type="button" onClick={() => setFormOpen(false)}>{text.cancel}</button><button className="primary" type="submit">{text.save}</button></footer></form></section></div>}
    {updates.length > 0 && <div className="company-watch-updates"><h3>{text.updates}</h3>{updates.map((event) => <article id={`company-watch-update-${event.id}`} className="company-watch-update" key={event.id}><div><strong>{event.title}</strong><p>{event.summary}</p></div><time>{formatDate(event.detected_at, locale)}</time></article>)}</div>}
    {actionTarget && createPortal(<div className="action-sheet-layer watch-target-action-layer"><button className="action-sheet-backdrop" aria-label={text.cancel} onClick={() => setActionsFor(null)} /><section className="action-sheet watch-target-action-sheet" role="dialog" aria-modal="true"><button type="button" onClick={() => edit(actionTarget)}>{text.edit}</button><button type="button" onClick={() => void changeEnabled(actionTarget)}>{actionTarget.enabled ? text.pause : text.resume}</button><button type="button" className="danger" onClick={() => void remove(actionTarget)}>{text.remove}</button><button type="button" className="cancel-action" onClick={() => setActionsFor(null)}>{text.cancel}</button></section></div>, document.body)}
  </section>;
}

function WatchLogin({ locale }: { locale: Locale }) { const text = watchText[locale], watch = useWatch(), [code, setCode] = useState(''), [error, setError] = useState(''); return <form className="watch-login" onSubmit={async (event) => { event.preventDefault(); try { await watch.connect(code); setCode(''); } catch { setError('AUTH_FAILED'); } }}><label>{text.code}<input type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} /></label><button className="primary">{text.connect}</button>{error && <small>{error}</small>}</form>; }

export function WatchConnectionSettings({ locale }: { locale: Locale }) {
  const text = watchText[locale], watch = useWatch();
  if (!watch.configured) return <section className="watch-connection-settings"><h3>{text.connection}</h3><p>{text.unavailable}</p></section>;
  return <section className="watch-connection-settings"><h3>{text.connection}</h3>{watch.authenticated ? <><p>{text.connected}</p><button type="button" onClick={watch.disconnect}>{text.disconnect}</button></> : <><p>{text.connectFromSettings}</p><WatchLogin locale={locale} /></>}</section>;
}

type NotificationPageProps = { locale: Locale; openCompany(id: string, name?: string, eventId?: string): void; openSettings(): void };

function dateGroup(value: string, locale: Locale, text: typeof watchText.ja | typeof watchText.zh) {
  const day = new Date(value); const today = new Date();
  const same = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (same(day, today)) return text.today;
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (same(day, yesterday)) return text.yesterday;
  return new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'zh-CN', { month: 'long', day: 'numeric' }).format(day);
}

export function NotificationPage({ locale, openCompany, openSettings }: NotificationPageProps) {
  const text = watchText[locale], watch = useWatch();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const events = useMemo(() => (filter === 'unread' ? watch.events.filter((event) => !event.read) : watch.events), [filter, watch.events]);
  const groups = useMemo(() => events.reduce<Record<string, WatchEvent[]>>((all, event) => { const key = dateGroup(event.detected_at, locale, text); (all[key] ||= []).push(event); return all; }, {}), [events, locale, text]);
  const choose = async (event: WatchEvent) => { if (!event.read) await watch.markRead(event.id); openCompany(event.company_id, event.company_name, event.id); };
  return <section className="notification-page">
    <header className="notification-page-head"><div><h1>{text.updates}</h1><p>{locale === 'ja' ? '採用情報ページの重要な更新を確認できます。' : '集中查看招聘页面的重要更新。'}</p></div>{watch.authenticated && <button type="button" className="text-button" onClick={() => void watch.markAllRead()} disabled={!watch.events.some((event) => !event.read)}>{text.markAllRead}</button>}</header>
    {!watch.configured ? <p className="notification-page-empty">{text.unavailable}</p> : !watch.authenticated ? <div className="notification-page-empty"><p>{text.notConnected}</p><button type="button" className="text-button" onClick={openSettings}>{text.goToSettings}<ExternalLink /></button></div> : <>
      <div className="notification-page-filters" role="tablist"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{text.all}</button><button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>{text.unread}</button></div>
      {events.length ? <div className="notification-day-groups">{Object.entries(groups).map(([day, group]) => <section key={day}><h2>{day}</h2><div>{group.map((event) => <button type="button" className={`notification-page-row${event.read ? ' is-read' : ''}`} key={event.id} onClick={() => void choose(event)}><span className="notification-page-dot" aria-hidden="true" /><span><strong>{event.company_name}</strong><b>{event.title}</b><small>{event.summary}</small></span><time>{formatDate(event.detected_at, locale)}</time></button>)}</div></section>)}</div> : <p className="notification-page-empty">{text.noUpdates}</p>}
    </>}
  </section>;
}

export function CompanyWatchStatus({ companyId, companyName, locale }: { companyId: string; companyName: string; locale: Locale }) {
  const text = watchText[locale], watch = useWatch();
  if (!watch.authenticated) return null;
  const key = companyWatchKey(companyName);
  const matchesCompany = (item: { company_id: string; company_name: string }) => item.company_id === companyId || companyWatchKey(item.company_name) === key;
  const target = watch.targets.find((item) => matchesCompany(item));
  const unread = watch.events.filter((event) => matchesCompany(event) && !event.read).length;
  if (!target && !unread) return null;
  const status = target ? targetStatus(target, text, locale) : null;
  return <span className={`company-watch-card-status${unread ? ' has-updates' : ''}`}>{unread ? `● ${unread}${locale === 'ja' ? '件の更新' : ' 条更新'}` : status?.label}</span>;
}
