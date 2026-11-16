import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, errKey, fieldErr } from '../api';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { Button, Card, CardHeader, Field, Input, Textarea } from '../components/ui';
import { Dropdown } from '../components/Controls';
import { AiBlock, TranslateBox, useAi } from '../components/Ai';
import { FileInput, type FileItem } from '../components/FileInput';

const CATS = ['water_supply', 'roads', 'electricity', 'sanitation', 'pensions', 'other'];
type Tri = { summary_en: string; summary_te: string; category: string; priority: string; reason: string };

export default function NewGrievance() {
  const { user } = useAuth(); const { t, lang } = useI18n(); const nav = useNavigate();
  const [f, setF] = useState({ citizenName: '', village: '', phone: '', category: 'water_supply', priority: 'medium', description: '', descriptionLang: 'te', submittedOn: new Date().toISOString().slice(0, 10) });
  const [files, setFiles] = useState<FileItem[]>([]); const [errs, setErrs] = useState<Record<string, string>>({}); const [top, setTop] = useState(''); const [busy, setBusy] = useState(false);
  const tri = useAi<Tri>('/ai/triage');
  if (user && user.role !== 'mandal_officer') return <Navigate to="/" replace />;
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setTop(''); const local: Record<string, string> = {};
    if (f.citizenName.trim().length < 2) local.citizenName = t('v_required');
    if (f.village.trim().length < 2) local.village = t('v_required');
    if (!/^[0-9]{10}$/.test(f.phone)) local.phone = t('v_phone');
    if (f.description.trim().length < 10) local.description = t('v_short');
    setErrs(local); if (Object.keys(local).length) { setTop(t('v_generic')); return; }
    setBusy(true);
    try { const r = await api('/grievances', { method: 'POST', body: { ...f, attachments: files } }); nav(`/grievances/${r.id}`, { state: { flash: `${t('registered_ok')}: ${r.refNo}` } }); }
    catch (er) { setErrs(fieldErr(er, t)); setTop(t(errKey(er))); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="w-full space-y-4" noValidate>
      <h1 className="text-xl font-bold text-navy-800">{t('new_title')}</h1>
      <p className="text-xs text-amber-800">{t('demo_data_hint')}</p>
      {top && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{top}</p>}
      <Card><CardHeader title={t('citizen_details')} />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Field label={t('citizen_name')} error={errs.citizenName}><Input value={f.citizenName} onChange={(e) => set('citizenName', e.target.value)} /></Field>
          <Field label={t('village')} error={errs.village}><Input value={f.village} onChange={(e) => set('village', e.target.value)} /></Field>
          <Field label={t('phone')} error={errs.phone}><Input inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))} /></Field>
          <Field label={t('submitted_on')}><Input type="date" max={new Date().toISOString().slice(0, 10)} value={f.submittedOn} onChange={(e) => set('submittedOn', e.target.value)} /></Field>
        </div></Card>
      <Card><CardHeader title={t('complaint')} />
        <div className="space-y-4 p-4">
          <Field label={t('desc_lang')}><Dropdown value={f.descriptionLang} onChange={(v) => set('descriptionLang', v)} options={[{ value: 'te', label: 'తెలుగు' }, { value: 'en', label: 'English' }]} /></Field>
          <Field label={t('description')} error={errs.description}><Textarea rows={6} value={f.description} onChange={(e) => set('description', e.target.value)} lang={f.descriptionLang} /></Field>
          {f.description.trim().length >= 10 && <TranslateBox text={f.description} lang={f.descriptionLang as 'te' | 'en'} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('category')}><Dropdown value={f.category} onChange={(v) => set('category', v)} options={CATS.map((c) => ({ value: c, label: t('cat_' + c) }))} /></Field>
            <Field label={t('priority')}><Dropdown value={f.priority} onChange={(v) => set('priority', v)} options={['high', 'medium', 'low'].map((c) => ({ value: c, label: t('pr_' + c) }))} /></Field>
          </div>
          <AiBlock ai={tri} onRun={() => f.description.trim().length >= 5 ? tri.run({ description: f.description }) : setErrs({ description: t('v_short') })}>
            {(r) => (<div className="space-y-2 text-sm">
              <div><b>{t('ai_summary')}:</b> {r.summary_en}</div><div><b>{t('ai_summary_te')}:</b> {r.summary_te}</div>
              <div><b>{t('ai_suggested_cat')}:</b> {t('cat_' + r.category)} · <b>{t('ai_suggested_pri')}:</b> {t('pr_' + r.priority)}</div>
              <div className="text-slate-600"><b>{t('ai_reason')}:</b> {r.reason}</div>
              <div className="flex flex-wrap gap-2"><Button type="button" size="sm" onClick={() => { set('category', r.category); set('priority', r.priority); tri.clear(); }}>{t('ai_apply')}</Button><Button type="button" size="sm" variant="ghost" onClick={tri.clear}>{t('ai_ignore')}</Button></div>
            </div>)}
          </AiBlock>
          <FileInput files={files} onChange={setFiles} label={t('attachments')} />
        </div></Card>
      <Button size="lg" className="w-full sm:w-auto" loading={busy}>{t('register')}</Button>
    </form>
  );
}
