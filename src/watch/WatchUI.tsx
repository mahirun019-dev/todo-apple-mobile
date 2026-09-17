import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
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

export function CompanyWatchSection({ company, locale, openSettings }: { company: { id: string; name: string }; locale: Locale; openSettings(): void }) {
  const text = watchText[locale], watch = useWatch();
  const [formOpen, setFormOpen] = useState(false), [editingId, setEditingId] = useState<string | null>(null), [sourceType, setSourceType] = useState<WatchSource>('official'), [url, setUrl] = useState(''), [label, setLabel] = useState(''), [message, setMessage] = useState(''), [actionsFor, setActionsFor] = useState<string | null>(null);
  const companyKey = companyWatchKey(company.name);
  const targets = watch.targets.filter((target) => target.company_id === company.id || companyWatchKey(target.company_name) === companyKey);
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
    {actionTarget && <div className="modal-layer watch-target-action-layer"><button className="modal-backdrop" aria-label={text.cancel} onClick={() => setActionsFor(null)} /><section className="action-sheet watch-target-action-sheet" role="dialog" aria-modal="true"><button type="button" onClick={() => edit(actionTarget)}>{text.edit}</button><button type="button" onClick={() => void changeEnabled(actionTarget)}>{actionTarget.enabled ? text.pause : text.resume}</button><button type="button" className="danger" onClick={() => void remove(actionTarget)}>{text.remove}</button><button type="button" className="cancel-action" onClick={() => setActionsFor(null)}>{text.cancel}</button></section></div>}
  </section>;
}

function WatchLogin({ locale }: { locale: Locale }) { const text = watchText[locale], watch = useWatch(), [code, setCode] = useState(''), [error, setError] = useState(''); return <form className="watch-login" onSubmit={async (event) => { event.preventDefault(); try { await watch.connect(code); setCode(''); } catch { setError('AUTH_FAILED'); } }}><label>{text.code}<input type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} /></label><button className="primary">{text.connect}</button>{error && <small>{error}</small>}</form>; }

export function WatchConnectionSettings({ locale }: { locale: Locale }) {
  const text = watchText[locale], watch = useWatch();
  if (!watch.configured) return <section className="watch-connection-settings"><h3>{text.connection}</h3><p>{text.unavailable}</p></section>;
  return <section className="watch-connection-settings"><h3>{text.connection}</h3>{watch.authenticated ? <><p>{text.connected}</p><button type="button" onClick={watch.disconnect}>{text.disconnect}</button></> : <><p>{text.connectFromSettings}</p><WatchLogin locale={locale} /></>}</section>;
}

type NotificationBellProps = {
  locale: Locale;
  openCompany(id: string, name?: string): void;
  openSettings(): void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function NotificationBell({ locale, openCompany, openSettings, open: controlledOpen, onOpenChange }: NotificationBellProps) {
  const text = watchText[locale], watch = useWatch();
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = (value: boolean) => {
    onOpenChange?.(value);
    if (!onOpenChange) setLocalOpen(value);
  };
  const triggerRef = useRef<HTMLButtonElement>(null), panelRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ top: 76, right: 24 });
  const unread = useMemo(() => watch.events.filter((event) => !event.read), [watch.events]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPosition({ top: Math.round(rect.bottom + 8), right: Math.round(window.innerWidth - rect.right) });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const closeFromOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const closeFromEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', closeFromOutside);
    document.addEventListener('keydown', closeFromEscape);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside);
      document.removeEventListener('keydown', closeFromEscape);
    };
  }, [open]);
  const choose = async (event: WatchEvent) => {
    if (!event.read) await watch.markRead(event.id);
    setOpen(false);
    openCompany(event.company_id, event.company_name);
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById('company-watch')?.scrollIntoView({ block: 'start', behavior: 'smooth' })));
  };
  if (!watch.configured) return null;
  const panel = open ? createPortal(<>
    <button className="watch-notification-backdrop" aria-label={text.cancel} onClick={() => setOpen(false)} />
    <section ref={panelRef} className="watch-notification-panel" style={{ '--notification-top': `${position.top}px`, '--notification-right': `${position.right}px` } as CSSProperties} role="dialog" aria-label={text.updates}>
      <header><h2>{text.updates}</h2><button type="button" className="watch-notification-close" onClick={() => setOpen(false)} aria-label={text.cancel}><X /></button></header>
      <div className="watch-notification-list">
        {!watch.authenticated ? <div className="watch-notification-login"><p>{text.notConnected}</p><button type="button" className="text-button" onClick={() => { setOpen(false); openSettings(); }}>{text.settings}<ExternalLink /></button></div> : watch.events.length ? watch.events.slice(0, 20).map((event) => <button key={event.id} className={`watch-notification-item${event.read ? ' is-read' : ''}`} onClick={() => void choose(event)}>
          <span className="watch-notification-dot" aria-hidden="true" />
          <span><strong>{event.company_name}</strong><small>{event.title}</small><small>{event.summary}</small></span><time>{formatDate(event.detected_at, locale)}</time>
        </button>) : <p className="watch-notification-empty">{locale === 'ja' ? '新しい企業アップデートはありません' : '暂无新的企业更新'}</p>}
      </div>
    </section>
  </>, document.body) : null;
  return <><button ref={triggerRef} type="button" className="watch-notification-trigger" onClick={() => setOpen(!open)} aria-label={`${text.updates}${unread.length ? ` ${unread.length}` : ''}`} aria-expanded={open}>
    <Bell aria-hidden="true" />{unread.length > 0 && <span>{unread.length > 99 ? '99+' : unread.length}</span>}
  </button>{panel}</>;
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
