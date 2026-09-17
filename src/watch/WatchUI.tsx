import { useMemo, useState, type FormEvent } from 'react';
import { ExternalLink, Eye, Pause, Pencil, Play, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { watchText } from './i18n';
import { useWatch } from './WatchProvider';
import type { WatchEvent, WatchSource } from './types';

type Locale = 'ja' | 'zh';
const formatDate = (value: string | null, locale: Locale) => value ? new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';

export function CompanyWatchSection({ company, locale }: { company: { id: string; name: string }; locale: Locale }) {
  const text = watchText[locale], watch = useWatch();
  const [formOpen, setFormOpen] = useState(false), [editingId, setEditingId] = useState<string | null>(null), [sourceType, setSourceType] = useState<WatchSource>('official'), [url, setUrl] = useState(''), [label, setLabel] = useState(''), [message, setMessage] = useState('');
  const targets = watch.targets.filter((target) => target.company_id === company.id);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage('');
    try {
      const response = await watch.request(editingId ? `/api/targets/${editingId}` : '/api/targets', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify({ companyId: company.id, companyName: company.name, sourceType, url, label }) });
      if (!response.ok) { const body = await response.json(); setMessage(body.error === 'DUPLICATE_URL' ? text.duplicate : text.invalid); return; }
      setFormOpen(false); setEditingId(null); setUrl(''); setLabel(''); await watch.refresh();
    } catch { setMessage(text.unavailable); }
  };
  return <section className="entity-card company-watch-section">
    <div className="company-watch-heading"><h2>{text.title}</h2>{watch.authenticated && <button type="button" className="text-button" onClick={() => { setEditingId(null); setSourceType('official'); setUrl(''); setLabel(''); setFormOpen(true); }}><Plus />{text.add}</button>}</div>
    {!watch.configured ? <p className="company-watch-muted">{text.unavailable}</p> : !watch.authenticated ? <WatchLogin locale={locale} /> : targets.length ? <div className="watch-target-list">{targets.map((target) => <article className="watch-target-item" key={target.id}>
      <div className="watch-target-copy"><strong>{target.label || text[target.source_type]}</strong><a href={target.url} target="_blank" rel="noreferrer" title={target.url}>{new URL(target.url).host}{new URL(target.url).pathname}<ExternalLink /></a><small className={`watch-status ${target.status}`}>{text[target.status]} · {text.lastCheck} {formatDate(target.last_checked_at, locale)}</small>{target.last_error && <small title={target.last_error}>{target.last_error}</small>}</div>
      <div className="watch-target-actions">
        <button title={text.edit} onClick={() => { setEditingId(target.id); setSourceType(target.source_type); setUrl(target.url); setLabel(target.label); setFormOpen(true); }}><Pencil /></button>
        {target.status === 'error' && <button title={text.retry} onClick={async () => { await watch.request(`/api/targets/${target.id}/retry`, { method: 'POST' }); await watch.refresh(); }}><RefreshCw /></button>}
        <button title={target.enabled ? text.pause : text.resume} onClick={async () => { await watch.request(`/api/targets/${target.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !target.enabled }) }); await watch.refresh(); }}>{target.enabled ? <Pause /> : <Play />}</button>
        <button title={text.remove} className="danger-icon" onClick={async () => { await watch.request(`/api/targets/${target.id}`, { method: 'DELETE' }); await watch.refresh(); }}><Trash2 /></button>
      </div>
    </article>)}</div> : <div className="company-watch-empty"><Eye /><p>{text.empty}</p><button type="button" onClick={() => setFormOpen(true)}><Plus />{text.add}</button></div>}
    {formOpen && <div className="modal-layer watch-dialog-layer"><button className="modal-backdrop" aria-label={text.cancel} onClick={() => setFormOpen(false)} /><section className="drawer entity-card watch-dialog" role="dialog" aria-modal="true"><header><h2>{text.add}</h2><button className="close-button" onClick={() => setFormOpen(false)} aria-label={text.cancel}><X /></button></header><form onSubmit={submit}><div className="form-grid"><label>{text.source}<select value={sourceType} onChange={(e) => setSourceType(e.target.value as WatchSource)}><option value="mynavi">{text.mynavi}</option><option value="official">{text.official}</option><option value="other">{text.other}</option></select></label><label>{text.url}<input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></label><label>{text.label}<input value={label} onChange={(e) => setLabel(e.target.value)} /></label></div>{message && <p className="form-error">{message}</p>}<footer className="form-actions"><button type="button" onClick={() => setFormOpen(false)}>{text.cancel}</button><button className="primary" type="submit">{text.save}</button></footer></form></section></div>}
  </section>;
}

function WatchLogin({ locale }: { locale: Locale }) { const text = watchText[locale], watch = useWatch(), [code, setCode] = useState(''), [error, setError] = useState(''); return <form className="watch-login" onSubmit={async (event) => { event.preventDefault(); try { await watch.connect(code); } catch { setError('AUTH_FAILED'); } }}><label>{text.code}<input type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} /></label><button className="primary">{text.connect}</button>{error && <small>{error}</small>}</form>; }

export function CompanyUpdatesSection({ locale, openCompany }: { locale: Locale; openCompany(id: string): void }) {
  const text = watchText[locale], watch = useWatch(), [selected, setSelected] = useState<WatchEvent | null>(null);
  const unread = useMemo(() => watch.events.filter((event) => !event.read), [watch.events]);
  if (!watch.authenticated || !unread.length) return null;
  const open = async (event: WatchEvent) => { setSelected(event); await watch.markRead(event.id); };
  return <><section className="entity-card company-updates-section"><div className="company-watch-heading"><h2>{text.updates}</h2><span>{unread.length}</span></div>{unread.slice(0, 3).map((event) => <button key={event.id} className="company-update-row" onClick={() => void open(event)}><span><strong>{event.company_name}</strong><small>{event.title}</small></span><time>{formatDate(event.detected_at, locale)}</time></button>)}</section>{selected && <div className="modal-layer watch-dialog-layer"><button className="modal-backdrop" onClick={() => setSelected(null)} /><section className="drawer entity-card watch-dialog watch-event-detail" role="dialog" aria-modal="true"><header><div><small>{text.updates}</small><h2>{selected.company_name}</h2></div><button className="close-button" onClick={() => setSelected(null)}><X /></button></header><h3>{selected.title}</h3><p>{selected.summary}</p>{selected.before_excerpt && <div><strong>{text.before}</strong><pre>{selected.before_excerpt}</pre></div>}{selected.after_excerpt && <div><strong>{text.after}</strong><pre>{selected.after_excerpt}</pre></div>}<p><small>{text.detected}: {formatDate(selected.detected_at, locale)}</small></p><div className="watch-event-actions"><button onClick={() => { setSelected(null); openCompany(selected.company_id); }}>{selected.company_name}</button><a className="primary" href={selected.source_url} target="_blank" rel="noreferrer">{text.open}<ExternalLink /></a></div></section></div>}</>;
}

export function CompanyWatchStatus({ companyId, locale }: { companyId: string; locale: Locale }) {
  const text = watchText[locale], watch = useWatch();
  if (!watch.authenticated) return null;
  const enabled = watch.targets.some((target) => target.company_id === companyId && Boolean(target.enabled));
  const unread = watch.events.filter((event) => event.company_id === companyId && !event.read).length;
  if (!enabled && !unread) return null;
  return <span className={`company-watch-card-status${unread ? ' has-updates' : ''}`}>{unread ? `● ${unread}${locale === 'ja' ? '件の更新' : ' 条更新'}` : text.active}</span>;
}
