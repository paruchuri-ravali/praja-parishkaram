import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ChevronDown, ClipboardCheck, Landmark, MapPin, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { Button, Card, Field, Input, cn } from '../components/ui';
import { LangSwitch } from '../App';

const ROLES = [
  { role: 'field_officer', icon: MapPin, users: [{ u: 'field1', n: 'K. Ramesh', te: 'కె. రమేష్' }, { u: 'field2', n: 'P. Lakshmi', te: 'పి. లక్ష్మి' }], desc_te: 'క్షేత్ర తనిఖీ చేసి నివేదిక పంపుతారు', desc_en: 'Visits the site and submits the verification report' },
  { role: 'mandal_officer', icon: ClipboardCheck, users: [{ u: 'mandal1', n: 'S. Venkata Rao', te: 'ఎస్. వెంకట రావు' }], desc_te: 'ఫిర్యాదులు నమోదు చేసి, అప్పగించి, నివేదికలు సమీక్షిస్తారు', desc_en: 'Registers, assigns and reviews field reports' },
  { role: 'approving_officer', icon: ShieldCheck, users: [{ u: 'approver1', n: 'D. Sujatha', te: 'డి. సుజాత' }], desc_te: 'తుది నిర్ణయం తీసుకుంటారు', desc_en: 'Takes the final decision' },
];

export default function Login() {
  const { user, login } = useAuth(); const { t, lang } = useI18n(); const nav = useNavigate();
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(''); const [manual, setManual] = useState(false);
  if (user) return <Navigate to="/" replace />;
  const go = async (un: string, pw: string) => {
    setBusy(un); setErr('');
    try { await login(un, pw); nav('/'); } catch { setErr(t('login_failed')); } finally { setBusy(''); }
  };
  return (
    <div className="min-h-screen px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Landmark className="size-8 text-navy-700" /><div><h1 className="text-xl font-bold leading-tight text-navy-800">{t('app_name')}</h1><p className="text-xs text-slate-500">{t('app_tag')}</p></div></div>
        <LangSwitch />
      </div>
      <div className="mt-8"><h2 className="text-lg font-semibold">{t('choose_user')}</h2><p className="text-sm text-slate-500">{t('choose_user_hint')}</p></div>
      {err && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{err}</p>}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {ROLES.map((r) => (
          <Card key={r.role} className="p-4">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-lg bg-navy-50 text-navy-700"><r.icon className="size-5" /></div>
              <div><div className="font-semibold text-navy-800">{t('role_' + r.role)}</div><div className="text-xs text-slate-500">{lang === 'te' ? r.desc_te : r.desc_en}</div></div></div>
            <div className="mt-3 space-y-2">
              {r.users.map((x) => (
                <button key={x.u} disabled={!!busy} onClick={() => go(x.u, 'Demo@123')} className={cn('flex min-h-14 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left transition hover:border-navy-500 hover:bg-navy-50 disabled:opacity-60', busy === x.u && 'border-navy-500 bg-navy-50')}>
                  <span className="grid size-9 place-items-center rounded-full bg-navy-700 text-sm font-semibold text-white">{x.n[0]}</span>
                  <span className="min-w-0 flex-1"><span className="block font-medium">{lang === 'te' ? x.te : x.n}</span><span className="block text-xs text-slate-500">{x.u}</span></span>
                  <span className="text-xs text-navy-700">{busy === x.u ? t('loading') : t('open')} →</span>
                </button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-6 max-w-md">
        <button onClick={() => setManual(!manual)} className="flex min-h-11 items-center gap-1 text-sm text-slate-600 hover:text-navy-700"><ChevronDown className={cn('size-4 transition', manual && 'rotate-180')} />{t('manual_login')}</button>
        {manual && (
          <Card className="mt-2 p-4"><form className="space-y-3" onSubmit={(e) => { e.preventDefault(); go(u, p); }}>
            <Field label={t('username')}><Input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required /></Field>
            <Field label={t('password')}><Input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" required /></Field>
            <Button className="w-full" loading={!!busy && busy === u}>{t('login')}</Button>
          </form></Card>
        )}
      </div>
      <p className="mt-8 text-xs text-slate-500">{t('demo_notice')} · {t('password')}: Demo@123</p>
    </div>
  );
}
