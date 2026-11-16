const BASE = import.meta.env.VITE_API_URL || '';
export class ApiError extends Error { constructor(public status: number, public code: string, public fields?: { path: string; message: string }[]) { super(code); } }

export const getToken = () => localStorage.getItem('token');
export const setToken = (t: string | null) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token'));

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(BASE + '/api' + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/login')) { setToken(null); location.href = '/login'; }
    throw new ApiError(res.status, j.error || 'error', j.fields);
  }
  return j as T;
}
export const attachmentUrl = (gid: number, aid: number) => `${BASE}/api/grievances/${gid}/attachments/${aid}`;
export async function fetchBlobUrl(gid: number, aid: number) {
  const r = await fetch(attachmentUrl(gid, aid), { headers: { Authorization: 'Bearer ' + getToken() } });
  if (!r.ok) throw new Error('fail');
  return URL.createObjectURL(await r.blob());
}
export const errKey = (e: unknown) => {
  if (e instanceof ApiError) {
    if (e.code === 'role_not_allowed' || e.code === 'forbidden') return 'err_forbidden';
    if (e.code === 'invalid_state') return 'err_state';
    if (e.code === 'not_assigned') return 'err_not_assigned';
    if (e.code === 'ai_timeout') return 'ai_timeout';
    if (e.code === 'ai_invalid_output') return 'ai_invalid';
    if (e.code.startsWith('ai_')) return 'ai_failed';
  }
  return 'err_generic';
};
export const fieldErr = (e: unknown, t: (k: string) => string) => {
  const out: Record<string, string> = {};
  if (e instanceof ApiError && e.fields) for (const f of e.fields) {
    const m = f.message;
    out[f.path] = m === 'phone_10_digits' ? t('v_phone') : m === 'future_date' ? t('v_future') : m === 'reason_required' ? t('v_reason') : m === 'unsupported_file_type' ? t('v_file') : /too_small|required|Invalid/i.test(m) ? t('v_short') : t('v_required');
  }
  return out;
};
