import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, Flame, Inbox, UserCheck, Clock } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { Card, CardHeader, Empty, ErrorState, PriorityBadge, Skeleton, StatusBadge, cn, fmtDate } from '../components/ui';

const STAGES = ['registered', 'awaiting_field_verification', 'awaiting_officer_review', 'awaiting_final_decision', 'returned', 'approved', 'rejected'];

export default function Dashboard() {
  const { user } = useAuth(); const { t, lang } = useI18n();
  const [d, setD] = useState<any>(null); const [err, setErr] = useState(false);
  const load = useCallback(() => { setErr(false); api('/dashboard').then(setD).catch(() => setErr(true)); }, []);
  useEffect(load, [load]);
  if (err) return <ErrorState onRetry={load} />;
  if (!d || !user) return <div className="space-y-4"><Skeleton className="h-16" /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>;
  const stats = [
    { k: 'stat_total', v: d.total, icon: ClipboardList, cls: 'text-navy-700', to: '/grievances' },
    { k: 'stat_pending', v: d.pending, icon: Clock, cls: 'text-sky-700', to: '/grievances' },
    { k: 'stat_high', v: d.high_priority, icon: Flame, cls: 'text-red-600', to: '/grievances?priority=high' },
    { k: 'stat_overdue', v: d.overdue, icon: AlertTriangle, cls: 'text-red-600', to: '/grievances?overdue=1' },
    { k: 'stat_done', v: d.completed, icon: CheckCircle2, cls: 'text-emerald-600', to: '/grievances' },
    { k: 'stat_mine', v: d.assignedToMe, icon: UserCheck, cls: 'text-navy-700', to: '/grievances?mine=1' },
    { k: 'stat_action', v: d.awaitingMyAction, icon: Inbox, cls: 'text-violet-700', to: '/grievances' },
  ];
  const stageMap = Object.fromEntries(d.byStage.map((s: any) => [s.status, s.count]));
  const max = Math.max(1, ...Object.values<number>(stageMap));
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold text-navy-800">{t('welcome')}, {lang === 'te' ? user.nameTe : user.name}</h1>
        <p className="mt-1 rounded-lg bg-navy-50 px-3 py-2 text-sm text-navy-800"><b>{t('your_next')}:</b> {t('next_' + user.role)}</p></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.k} to={s.to}><Card className="p-4 transition hover:shadow-md"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{t(s.k)}</span><s.icon className={cn('size-4.5', s.cls)} strokeWidth={1.75} /></div><div className={cn('mt-2 text-3xl font-bold', s.cls)}>{s.v}</div></Card></Link>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title={t('work_queue')} right={<Link className="text-sm text-navy-600 hover:underline" to="/grievances">{t('view_all')}</Link>} />
          {d.queue.length === 0 ? <Empty title={t('queue_empty')} /> : (
            <ul className="divide-y divide-slate-100">
              {d.queue.map((q: any) => (
                <li key={q.id}><Link to={`/grievances/${q.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-slate-500">{q.ref_no}</span>{q.overdue && <span className="rounded bg-red-600 px-1.5 text-[11px] font-semibold text-white">{t('overdue')}</span>}</div>
                    <div className="truncate font-medium">{q.citizen_name}</div><div className="truncate text-xs text-slate-500">{q.village} · {t('cat_' + q.category)} · {t('due')} {fmtDate(q.due_on, lang)}</div></div>
                  <div className="flex flex-col items-end gap-1"><PriorityBadge priority={q.priority} /><StatusBadge status={q.status} /></div>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={t('by_stage')} />
          <ul className="space-y-3 p-4">
            {STAGES.map((s) => (
              <li key={s}><Link to={`/grievances?status=${s}`} className="block"><div className="mb-1 flex justify-between text-sm"><span>{t('st_' + s)}</span><b>{stageMap[s] ?? 0}</b></div>
                <div className="h-2 rounded-full bg-slate-100"><div className={cn('h-2 rounded-full', s === 'approved' ? 'bg-emerald-500' : s === 'rejected' ? 'bg-red-400' : s === 'returned' ? 'bg-amber-500' : 'bg-navy-500')} style={{ width: `${((stageMap[s] ?? 0) / max) * 100}%` }} /></div></Link></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
