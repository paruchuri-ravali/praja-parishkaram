import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CircleDot, FileText, History, ImageIcon, Paperclip, ShieldAlert } from 'lucide-react';
import { api, errKey, fetchBlobUrl, fieldErr } from '../api';
import { useAuth, type User } from '../auth';
import { useI18n } from '../i18n';
import { Button, Card, CardHeader, ErrorState, Field, Input, PriorityBadge, Skeleton, StatusBadge, Textarea, cn, dateOnly, fmtDate, fmtDateTime } from '../components/ui';
import { CheckRow, ConfirmDialog, Dropdown, RadioCards } from '../components/Controls';
import { AiBlock, List, TranslateBox, useAi } from '../components/Ai';
import { FileInput, type FileItem } from '../components/FileInput';

const CATS = ['water_supply', 'roads', 'electricity', 'sanitation', 'pensions', 'other'];
const STAGE_OF: Record<string, number> = { registered: 1, returned: 2, awaiting_field_verification: 2, awaiting_officer_review: 3, awaiting_final_decision: 4, approved: 5, rejected: 5 };

function Progress({ status }: { status: string }) {
  const { t } = useI18n(); const cur = STAGE_OF[status];
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label={t('progress')}>
      {[1, 2, 3, 4].map((n) => {
        const done = cur > n || (cur === 5); const active = cur === n;
        return (<li key={n} className="text-center">
          <div className={cn('mx-auto grid size-8 place-items-center rounded-full border-2 text-sm font-semibold', done ? 'border-emerald-500 bg-emerald-500 text-white' : active ? (status === 'returned' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-navy-600 bg-navy-50 text-navy-700') : 'border-slate-300 text-slate-400')}>{done ? <Check className="size-4" /> : active ? <CircleDot className="size-4" /> : n}</div>
          <div className={cn('mt-1 text-[11px] leading-tight sm:text-xs', active ? 'font-semibold text-navy-800' : 'text-slate-500')}>{t('stage_' + n)}</div></li>);
      })}
    </ol>
  );
}

function Thumb({ gid, a }: { gid: number; a: any }) {
  const [url, setUrl] = useState('');
  useEffect(() => { let u = ''; fetchBlobUrl(gid, a.id).then((x) => { u = x; setUrl(x); }).catch(() => {}); return () => { if (u) URL.revokeObjectURL(u); }; }, [gid, a.id]);
  return (
    <a href={url || undefined} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm hover:bg-slate-50">
      {a.mimeType.startsWith('image/') && url ? <img src={url} alt={a.fileName} className="size-12 rounded object-cover" /> : <div className="grid size-12 place-items-center rounded bg-slate-100">{a.mimeType.startsWith('image/') ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}</div>}
      <span className="min-w-0 truncate">{a.fileName}</span>
    </a>
  );
}

// ---------------- action panels ----------------
function AssignPanel({ g, reload }: { g: any; reload: () => void }) {
  const { t } = useI18n(); const [officers, setOfficers] = useState<any[]>([]); const [sel, setSel] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { api('/auth/officers').then((o) => setOfficers(o.filter((x: any) => x.role === 'field_officer'))); }, []);
  const go = async () => { setBusy(true); setErr(''); try { await api(`/grievances/${g.id}/assign`, { method: 'POST', body: { assigneeId: Number(sel) } }); reload(); } catch (e) { setErr(t(errKey(e))); } finally { setBusy(false); } };
  const { lang } = useI18n();
  return (<div className="space-y-3 p-4">
    {g.status === 'returned' && <p className="rounded bg-amber-50 p-2 text-sm text-amber-900">{t('st_returned')}</p>}
    <Field label={t('assign_to')}><Dropdown value={sel} onChange={setSel} placeholder="—" options={officers.map((o) => ({ value: String(o.id), label: lang === 'te' ? o.nameTe : o.name }))} /></Field>
    {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
    <Button size="lg" disabled={!sel} loading={busy} onClick={go}>{g.status === 'returned' ? t('reassign') : t('assign_btn')}</Button>
  </div>);
}

function ClassifyPanel({ g, reload }: { g: any; reload: () => void }) {
  const { t } = useI18n(); const [c, setC] = useState(g.category); const [p, setP] = useState(g.priority); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await api(`/grievances/${g.id}/classification`, { method: 'PATCH', body: { category: c, priority: p } }); reload(); } finally { setBusy(false); } };
  return (<div className="grid gap-3 p-4 sm:grid-cols-3">
    <Dropdown value={c} onChange={setC} ariaLabel={t('category')} options={CATS.map((x) => ({ value: x, label: t('cat_' + x) }))} />
    <Dropdown value={p} onChange={setP} ariaLabel={t('priority')} options={['high', 'medium', 'low'].map((x) => ({ value: x, label: t('pr_' + x) }))} />
    <Button variant="outline" loading={busy} disabled={c === g.category && p === g.priority} onClick={save}>{t('save')}</Button>
  </div>);
}

function VerifyPanel({ g, reload }: { g: any; reload: () => void }) {
  const { t, lang } = useI18n();
  const [f, setF] = useState({ visitDate: new Date().toISOString().slice(0, 10), observations: '', findings: '', evidenceNotes: '', outcome: '' });
  const [checklist, setChecklist] = useState<{ item: string; done: boolean }[]>([]); const [files, setFiles] = useState<FileItem[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({}); const [top, setTop] = useState(''); const [busy, setBusy] = useState(false);
  const cl = useAi<{ items: string[] }>('/ai/checklist'); const sum = useAi<{ summary: string; missing: string[] }>('/ai/field-summary');
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTop(''); const l: Record<string, string> = {};
    if (f.observations.trim().length < 10) l.observations = t('v_short'); if (f.findings.trim().length < 10) l.findings = t('v_short'); if (!f.outcome) l.outcome = t('v_required'); if (!f.visitDate) l.visitDate = t('v_required');
    setErrs(l); if (Object.keys(l).length) { setTop(t('v_generic')); return; }
    setBusy(true);
    try { await api(`/grievances/${g.id}/verification`, { method: 'POST', body: { ...f, checklist, attachments: files } }); reload(); }
    catch (er) { setErrs(fieldErr(er, t)); setTop(t(errKey(er))); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4 p-4">
      {top && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{top}</p>}
      <AiBlock title={t('ai_checklist')} ai={cl} onRun={() => cl.run({ grievanceId: g.id, lang })}>
        {(r) => (<div className="space-y-2"><List items={r.items} empty={t('ai_none')} /><Button type="button" size="sm" onClick={() => { setChecklist((c) => [...c, ...r.items.filter((i) => !c.some((x) => x.item === i)).map((item) => ({ item, done: false }))]); cl.clear(); }}>{t('ai_use_checklist')}</Button></div>)}
      </AiBlock>
      {checklist.length > 0 && <fieldset className="space-y-1"><legend className="mb-1 text-sm font-medium">{t('checklist')}</legend>
        {checklist.map((c, i) => <CheckRow key={i} className="rounded-lg border border-slate-200 bg-white p-2" checked={c.done} onChange={(v) => setChecklist(checklist.map((x, k) => k === i ? { ...x, done: v } : x))}>{c.item}</CheckRow>)}</fieldset>}
      <Field label={t('visit_date')} error={errs.visitDate}><Input type="date" max={new Date().toISOString().slice(0, 10)} value={f.visitDate} onChange={(e) => set('visitDate', e.target.value)} /></Field>
      <Field label={t('observations')} error={errs.observations}><Textarea rows={4} value={f.observations} onChange={(e) => set('observations', e.target.value)} /></Field>
      <Field label={t('findings')} error={errs.findings}><Textarea rows={3} value={f.findings} onChange={(e) => set('findings', e.target.value)} /></Field>
      <Field label={t('evidence_notes')}><Textarea rows={2} value={f.evidenceNotes} onChange={(e) => set('evidenceNotes', e.target.value)} /></Field>
      <FileInput files={files} onChange={setFiles} label={t('field_attach')} />
      <fieldset><legend className="mb-1 text-sm font-medium">{t('outcome')}</legend>
        <RadioCards value={f.outcome} onChange={(v) => set('outcome', v)} options={['verified', 'partially_verified', 'not_verified'].map((o) => ({ value: o, label: t('out_' + o) }))} />
        {errs.outcome && <p role="alert" className="mt-1 text-xs text-red-600">{errs.outcome}</p>}</fieldset>
      <AiBlock title={t('ai_missing')} ai={sum} onRun={() => sum.run(f)}>
        {(r) => (<div className="space-y-2 text-sm"><p>{r.summary}</p><div className="font-medium">{t('ai_missing')}:</div><List items={r.missing} empty={t('ai_none')} /></div>)}
      </AiBlock>
      <Button size="lg" className="w-full sm:w-auto" loading={busy}>{t('submit_report')}</Button>
    </form>
  );
}

function ReviewPanel({ g, reload }: { g: any; reload: () => void }) {
  const { t } = useI18n(); const [notes, setNotes] = useState(''); const [rec, setRec] = useState(''); const [errs, setErrs] = useState<Record<string, string>>({}); const [top, setTop] = useState(''); const [busy, setBusy] = useState('');
  const ai = useAi<{ case_summary: string; inconsistencies: string[]; missing_evidence: string[]; draft_recommendation: string }>('/ai/review-assist');
  const act = async (action: 'forward' | 'return') => {
    setTop(''); const l: Record<string, string> = {};
    if (notes.trim().length < 5) l.notes = t('v_short'); if (action === 'forward' && rec.trim().length < 5) l.recommendation = t('v_short');
    setErrs(l); if (Object.keys(l).length) { setTop(t('v_generic')); return; }
    setBusy(action);
    try { await api(`/grievances/${g.id}/review`, { method: 'POST', body: { action, notes, recommendation: rec } }); reload(); } catch (er) { setErrs(fieldErr(er, t)); setTop(t(errKey(er))); } finally { setBusy(''); }
  };
  return (
    <div className="space-y-4 p-4">
      {top && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{top}</p>}
      <AiBlock ai={ai} onRun={() => ai.run({ grievanceId: g.id })}>
        {(r) => (<div className="space-y-2 text-sm"><div><b>{t('ai_case_summary')}:</b> {r.case_summary}</div>
          <div><b>{t('ai_incons')}:</b><List items={r.inconsistencies} empty={t('ai_none')} /></div><div><b>{t('ai_missing_ev')}:</b><List items={r.missing_evidence} empty={t('ai_none')} /></div>
          <div className="rounded border border-slate-200 bg-white p-2"><b>{t('ai_draft_rec')}:</b><p className="mt-1 whitespace-pre-wrap">{r.draft_recommendation}</p><Button type="button" size="sm" className="mt-2" onClick={() => setRec(r.draft_recommendation)}>{t('ai_use_draft')}</Button></div></div>)}
      </AiBlock>
      <Field label={t('review_notes')} error={errs.notes}><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      <Field label={t('recommendation')} error={errs.recommendation}><Textarea rows={4} value={rec} onChange={(e) => setRec(e.target.value)} /></Field>
      <div className="flex flex-col gap-2 sm:flex-row"><Button size="lg" loading={busy === 'forward'} onClick={() => act('forward')}>{t('forward')}</Button><Button size="lg" variant="amber" loading={busy === 'return'} onClick={() => act('return')}>{t('return_field')}</Button></div>
    </div>
  );
}

function DecisionPanel({ g, reload }: { g: any; reload: () => void }) {
  const { t } = useI18n(); const [reason, setReason] = useState(''); const [pending, setPending] = useState<'approve' | 'reject' | 'return' | ''>(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const ai = useAi<{ draft_note: string; points_to_consider: string[] }>('/ai/decision-note');
  const ask = (d: 'approve' | 'reject' | 'return') => { if (d !== 'approve' && reason.trim().length < 5) { setErr(t('v_reason')); return; } setErr(''); setPending(d); };
  const confirm = async () => { setBusy(true); try { await api(`/grievances/${g.id}/decision`, { method: 'POST', body: { decision: pending, reason, confirm: true } }); setPending(''); reload(); } catch (e) { setPending(''); setErr(t(errKey(e))); } finally { setBusy(false); } };
  return (
    <div className="space-y-4 p-4">
      <AiBlock ai={ai} onRun={() => ai.run({ grievanceId: g.id })}>
        {(r) => (<div className="space-y-2 text-sm"><div className="rounded border border-slate-200 bg-white p-2"><b>{t('ai_note')}:</b><p className="mt-1 whitespace-pre-wrap">{r.draft_note}</p><Button type="button" size="sm" className="mt-2" onClick={() => setReason(r.draft_note)}>{t('ai_use_draft')}</Button></div><b>{t('ai_points')}:</b><List items={r.points_to_consider} empty={t('ai_none')} /></div>)}
      </AiBlock>
      <Field label={t('reason_req')} error={err}><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="grid gap-2 sm:grid-cols-3"><Button size="lg" variant="success" onClick={() => ask('approve')}>{t('approve')}</Button><Button size="lg" variant="danger" onClick={() => ask('reject')}>{t('reject')}</Button><Button size="lg" variant="amber" onClick={() => ask('return')}>{t('return_info')}</Button></div>
      <ConfirmDialog open={!!pending} onOpenChange={(o) => !o && setPending('')} title={<span className="flex items-center gap-2"><ShieldAlert className="size-5 text-amber-600" />{t('confirm_title')}</span>} description={t('confirm_body')}
        footer={<><Button variant="outline" onClick={() => setPending('')}>{t('cancel')}</Button><Button variant={pending === 'approve' ? 'success' : pending === 'reject' ? 'danger' : 'amber'} loading={busy} onClick={confirm}>{t('confirm_yes')}</Button></>}>
        <p className="text-sm"><b>{pending && t(pending === 'return' ? 'return_info' : pending)}</b></p>{reason && <p className="rounded bg-slate-50 p-2 text-sm">{reason}</p>}
      </ConfirmDialog>
    </div>
  );
}

// ---------------- page ----------------
export default function Detail() {
  const { id } = useParams(); const { user } = useAuth() as { user: User }; const { t, lang } = useI18n(); const loc = useLocation();
  const [g, setG] = useState<any>(null); const [err, setErr] = useState(''); const [flash, setFlash] = useState<string>((loc.state as any)?.flash || '');
  const load = useCallback(() => { setErr(''); api(`/grievances/${id}`).then(setG).catch((e) => setErr(e.status === 403 ? 'forbidden' : 'load')); }, [id]);
  useEffect(load, [load]);
  const reload = () => { setFlash(t('action_done')); load(); };
  if (err === 'forbidden') return <Card className="p-8 text-center text-red-700">{t('err_forbidden')}</Card>;
  if (err) return <ErrorState onRetry={load} />;
  if (!g) return <div className="space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;

  const role = user.role; const s = g.status;
  const canAssign = role === 'mandal_officer' && (s === 'registered' || s === 'returned');
  const canVerify = role === 'field_officer' && s === 'awaiting_field_verification' && g.assignedTo?.id === user.id;
  const canReview = role === 'mandal_officer' && s === 'awaiting_officer_review';
  const canDecide = role === 'approving_officer' && s === 'awaiting_final_decision';
  const hasAction = canAssign || canVerify || canReview || canDecide;
  const latestField = g.fieldReports[0];

  return (
    <div className="space-y-4">
      <Link to="/grievances" className="inline-flex min-h-11 items-center gap-1 text-sm text-navy-700 hover:underline"><ArrowLeft className="size-4" />{t('detail_back')}</Link>
      {flash && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{flash}</p>}
      <Card className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div><div className="font-mono text-sm text-slate-500">{g.refNo}</div><h1 className="text-xl font-bold text-navy-800">{g.citizenName}</h1></div>
          <div className="flex flex-wrap items-center gap-2">{g.overdue && <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">{t('overdue')}</span>}<PriorityBadge priority={g.priority} /><StatusBadge status={s} /></div>
        </div>
        <Progress status={s} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {hasAction && (
            <Card className="border-navy-300 ring-1 ring-navy-200">
              <CardHeader title={canAssign ? t('assign') : canVerify ? t('field_report') : canReview ? t('review_section') : t('decision')} />
              {canAssign && <><AssignPanel g={g} reload={reload} /><div className="border-t border-slate-100"><div className="px-4 pt-3 text-sm font-medium">{t('edit_class')}</div><ClassifyPanel g={g} reload={reload} /></div></>}
              {canVerify && <VerifyPanel g={g} reload={reload} />}
              {canReview && <ReviewPanel g={g} reload={reload} />}
              {canDecide && <DecisionPanel g={g} reload={reload} />}
            </Card>
          )}
          {!hasAction && <Card className="p-4 text-sm text-slate-600">{t('no_action')}</Card>}

          <Card><CardHeader title={t('complaint')} icon={<FileText className="size-4" />} right={<span className="text-sm text-slate-500">{t('cat_' + g.category)}</span>} />
            <div className="space-y-3 p-4"><div className="text-xs font-medium text-slate-500">{t('original_text')}</div>
              <p lang={g.descriptionLang} className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{g.description}</p>
              <TranslateBox text={g.description} lang={g.descriptionLang} /></div></Card>

          <Card><CardHeader title={t('field_report')} />
            {g.fieldReports.length === 0 ? <p className="p-4 text-sm text-slate-500">{t('no_field_report')}</p> : g.fieldReports.map((f: any, i: number) => (
              <div key={f.id} className={cn('space-y-2 p-4 text-sm', i > 0 && 'border-t border-slate-100 opacity-75')}>
                <div className="flex flex-wrap justify-between gap-2"><span>{f.officerName} · {t('visit_date')}: {fmtDate(f.visitDate, lang)}</span><span className="rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-800">{t('out_' + f.outcome)}</span></div>
                <div><b>{t('observations')}:</b> <span className="whitespace-pre-wrap">{f.observations}</span></div><div><b>{t('findings')}:</b> {f.findings}</div>
                {f.evidenceNotes && <div><b>{t('evidence_notes')}:</b> {f.evidenceNotes}</div>}
                {f.checklist?.length > 0 && <ul className="space-y-0.5">{f.checklist.map((c: any, k: number) => <li key={k} className="flex gap-2"><span>{c.done ? '☑' : '☐'}</span>{c.item}</li>)}</ul>}
              </div>))}
          </Card>

          <Card><CardHeader title={t('review_section')} />
            {g.reviews.length === 0 ? <p className="p-4 text-sm text-slate-500">{t('no_reviews')}</p> : g.reviews.map((r: any) => (
              <div key={r.id} className="space-y-1 border-b border-slate-100 p-4 text-sm last:border-0"><div className="text-xs text-slate-500">{r.officerName} · {fmtDateTime(r.createdAt, lang)} · {r.action === 'forward' ? t('forward') : t('return_field')}</div><div><b>{t('review_notes')}:</b> {r.notes}</div>{r.recommendation && <div><b>{t('recommendation')}:</b> {r.recommendation}</div>}</div>))}
          </Card>

          {g.decisions.length > 0 && <Card><CardHeader title={t('decisions_history')} />
            {g.decisions.map((d: any) => (<div key={d.id} className="border-b border-slate-100 p-4 text-sm last:border-0"><div className="font-semibold">{t(d.decision === 'return' ? 'return_info' : d.decision)}</div><div className="text-xs text-slate-500">{d.officerName} · {fmtDateTime(d.decidedAt, lang)}</div>{d.reason && <p className="mt-1"><b>{t('reason')}:</b> {d.reason}</p>}</div>))}</Card>}
        </div>

        <div className="space-y-4">
          <Card><CardHeader title={t('citizen_details')} />
            <dl className="space-y-2 p-4 text-sm">
              {[[t('village'), g.village], [t('phone'), g.phone], [t('category'), t('cat_' + g.category)], [t('submitted'), fmtDate(dateOnly(g.submittedOn), lang)], [t('due'), fmtDate(dateOnly(g.dueOn), lang)], [t('assigned_to'), g.assignedTo?.name ?? t('not_assigned')]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium">{v}</dd></div>))}
            </dl></Card>
          <Card><CardHeader title={t('attachments_title')} icon={<Paperclip className="size-4" />} />
            <div className="space-y-2 p-4">{g.attachments.length === 0 ? <p className="text-sm text-slate-500">{t('no_attachments')}</p> : g.attachments.map((a: any) => <div key={a.id}><div className="mb-0.5 text-[11px] text-slate-500">{t('stage_' + a.stage)}</div><Thumb gid={g.id} a={a} /></div>)}</div></Card>
          <Card><CardHeader title={t('timeline')} icon={<History className="size-4" />} />
            <ol className="relative space-y-4 p-4">
              {g.history.map((h: any) => (
                <li key={h.id} className="relative border-l-2 border-navy-200 pl-4"><span className="absolute -left-[5px] top-1.5 size-2 rounded-full bg-navy-600" />
                  <div className="text-sm font-semibold">{t('act_' + h.action)}</div>
                  <div className="text-xs text-slate-500">{h.actorName} · {t('role_' + h.actorRole)}</div><div className="text-xs text-slate-500">{fmtDateTime(h.createdAt, lang)}</div>
                  {h.fromStatus && h.toStatus && h.fromStatus !== h.toStatus && <div className="mt-1 flex flex-wrap items-center gap-1 text-xs"><StatusBadge status={h.fromStatus} />→<StatusBadge status={h.toStatus} /></div>}
                  {h.comment && <p className="mt-1 rounded bg-slate-50 p-2 text-xs">{h.comment}</p>}
                </li>))}
            </ol></Card>
        </div>
      </div>
    </div>
  );
}
