import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowDownUp, Search } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { Card, Empty, ErrorState, Input, PriorityBadge, Skeleton, StatusBadge, fmtDate } from '../components/ui';
import { CheckRow, Dropdown } from '../components/Controls';

const STATUSES = ['registered', 'awaiting_field_verification', 'awaiting_officer_review', 'awaiting_final_decision', 'returned', 'approved', 'rejected'];
const CATS = ['water_supply', 'roads', 'electricity', 'sanitation', 'pensions', 'other'];

export default function Grievances() {
  const { t, lang } = useI18n(); const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState<any[] | null>(null); const [err, setErr] = useState(false);
  const [q, setQ] = useState(sp.get('q') || '');
  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }); };
  const qs = sp.toString();
  const load = useCallback(() => { setErr(false); api('/grievances?' + qs).then(setRows).catch(() => setErr(true)); }, [qs]);
  useEffect(() => { const h = setTimeout(load, 150); return () => clearTimeout(h); }, [load]);
  useEffect(() => { const h = setTimeout(() => { if ((sp.get('q') || '') !== q) set('q', q); }, 300); return () => clearTimeout(h); }, [q]); // eslint-disable-line
  const sort = sp.get('sort') || 'date'; const dir = sp.get('dir') || 'desc';
  const toggleSort = (k: string) => { const n = new URLSearchParams(sp); n.set('sort', k); n.set('dir', sort === k && dir === 'desc' ? 'asc' : 'desc'); setSp(n, { replace: true }); };
  const Th = ({ k, children, cls = '' }: { k: string; children: string; cls?: string }) => (
    <th className={`px-3 py-2 text-left font-medium ${cls}`}><button className="inline-flex min-h-9 items-center gap-1 hover:text-navy-700" onClick={() => toggleSort(k)}>{children}<ArrowDownUp className={`size-3 ${sort === k ? 'text-navy-700' : 'text-slate-300'}`} /></button></th>
  );
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-navy-800">{t('nav_grievances')}</h1>
      <Card className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2"><Search className="absolute left-3 top-3.5 size-4 text-slate-400" /><Input className="pl-9" placeholder={t('search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('search')} /></div>
        <Dropdown value={sp.get('status') || ''} onChange={(v) => set('status', v)} ariaLabel={t('status')} allLabel={`${t('status')}: ${t('all')}`} options={STATUSES.map((s) => ({ value: s, label: t('st_' + s) }))} />
        <Dropdown value={sp.get('priority') || ''} onChange={(v) => set('priority', v)} ariaLabel={t('priority')} allLabel={`${t('priority')}: ${t('all')}`} options={['high', 'medium', 'low'].map((s) => ({ value: s, label: t('pr_' + s) }))} />
        <Dropdown value={sp.get('category') || ''} onChange={(v) => set('category', v)} ariaLabel={t('category')} allLabel={`${t('category')}: ${t('all')}`} options={CATS.map((s) => ({ value: s, label: t('cat_' + s) }))} />
        <Input placeholder={t('village')} value={sp.get('village') || ''} onChange={(e) => set('village', e.target.value)} aria-label={t('village')} />
        <CheckRow checked={sp.get('overdue') === '1'} onChange={(v) => set('overdue', v ? '1' : '')}>{t('only_overdue')}</CheckRow>
        {user?.role !== 'field_officer' && <CheckRow checked={sp.get('mine') === '1'} onChange={(v) => set('mine', v ? '1' : '')}>{t('only_mine')}</CheckRow>}
      </Card>
      {err ? <ErrorState onRetry={load} /> : !rows ? <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div> : rows.length === 0 ? <Card><Empty title={t('no_results')} hint={t('no_results_hint')} /></Card> : (
        <>
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600"><tr>
                <Th k="ref">{t('ref')}</Th><Th k="citizen">{t('citizen')}</Th><Th k="village">{t('village')}</Th><Th k="category">{t('category')}</Th><Th k="priority">{t('priority')}</Th><Th k="status">{t('status')}</Th><Th k="date">{t('submitted')}</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs"><Link className="text-navy-700 hover:underline" to={`/grievances/${r.id}`}>{r.refNo}</Link>{r.overdue && <span className="ml-1 rounded bg-red-600 px-1 text-[10px] font-semibold text-white">{t('overdue')}</span>}</td>
                    <td className="px-3 py-2">{r.citizenName}</td><td className="px-3 py-2">{r.village}</td><td className="px-3 py-2">{t('cat_' + r.category)}</td>
                    <td className="px-3 py-2"><PriorityBadge priority={r.priority} /></td><td className="px-3 py-2"><StatusBadge status={r.status} /></td><td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.submittedOn, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <ul className="space-y-2 md:hidden">
            {rows.map((r) => (
              <li key={r.id}><Link to={`/grievances/${r.id}`}><Card className="space-y-1 p-3"><div className="flex items-center justify-between"><span className="font-mono text-xs text-slate-500">{r.refNo}</span><PriorityBadge priority={r.priority} /></div>
                <div className="font-medium">{r.citizenName} {r.overdue && <span className="rounded bg-red-600 px-1 text-[10px] font-semibold text-white">{t('overdue')}</span>}</div><div className="text-xs text-slate-500">{r.village} · {t('cat_' + r.category)}</div><StatusBadge status={r.status} /></Card></Link></li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
