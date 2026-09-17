import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { WatchEvent, WatchTarget } from './types';

const API = (import.meta.env.VITE_WATCH_API_URL as string | undefined)?.replace(/\/$/, '');
const TOKEN_KEY = 'careerflow-watch-session';
type ContextValue = { configured: boolean; authenticated: boolean; targets: WatchTarget[]; events: WatchEvent[]; error: string; connect(code: string): Promise<void>; refresh(): Promise<void>; request(path: string, init?: RequestInit): Promise<Response>; markRead(id: string): Promise<void>; };
const Context = createContext<ContextValue | null>(null);

// Company data remains local in CareerFlow. This key lets authenticated devices
// recognize the same company even when their local record IDs differ.
export function companyWatchKey(name: string) {
  return name
    .normalize('NFKC')
    .toLocaleLowerCase('ja-JP')
    .replace(/(株式会社|有限会社|\(株\)|（株）|\(有\)|（有）)/g, '')
    .replace(/[\s・.．,，、()（）\-]/g, '');
}

export function WatchProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '');
  const [targets, setTargets] = useState<WatchTarget[]>([]);
  const [events, setEvents] = useState<WatchEvent[]>([]);
  const [error, setError] = useState('');
  const request = useCallback(async (path: string, init: RequestInit = {}) => {
    if (!API) throw new Error('NOT_CONFIGURED');
    const response = await fetch(`${API}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init.headers || {}), ...(token ? { authorization: `Bearer ${token}` } : {}) } });
    if (response.status === 401 && path !== '/api/session') {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      setToken('');
    }
    return response;
  }, [token]);
  const refresh = useCallback(async () => {
    if (!API || !token) return;
    const response = await request('/api/targets');
    if (!response.ok) { setError((await response.json().catch(() => ({}))).error || 'LOAD_FAILED'); return; }
    const body = await response.json(); setTargets(body.targets || []); setEvents(body.events || []); setError('');
  }, [request, token]);
  useEffect(() => {
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    void refresh();
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('pageshow', syncWhenVisible);
    return () => {
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('pageshow', syncWhenVisible);
    };
  }, [refresh]);
  useEffect(() => {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  }, [token]);
  const connect = async (code: string) => {
    if (!API) throw new Error('NOT_CONFIGURED');
    const response = await fetch(`${API}/api/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code.trim() }) });
    if (!response.ok) throw new Error('AUTH_FAILED');
    const body = await response.json(); localStorage.setItem(TOKEN_KEY, body.token); sessionStorage.removeItem(TOKEN_KEY); setToken(body.token);
  };
  const markRead = async (id: string) => { await request(`/api/events/${id}/read`, { method: 'POST' }); setEvents((current) => current.map((event) => event.id === id ? { ...event, read: 1 } : event)); };
  const value = useMemo(() => ({ configured: Boolean(API), authenticated: Boolean(token), targets, events, error, connect, refresh, request, markRead }), [token, targets, events, error, request, refresh]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWatch() { const value = useContext(Context); if (!value) throw new Error('WatchProvider missing'); return value; }
