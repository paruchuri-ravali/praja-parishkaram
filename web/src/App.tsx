import { useState } from 'react';
import { Navigate, NavLink, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, FilePlus2, LogOut, Menu, X, Landmark, FlaskConical } from 'lucide-react';
import { useAuth } from './auth';
import { useI18n } from './i18n';
import { cn, Skeleton } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Grievances from './pages/Grievances';
import NewGrievance from './pages/NewGrievance';
import Detail from './pages/Detail';

export function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div role="group" aria-label="Language" className={cn('inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-sm', className)}>
      {(['te', 'en'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l} className={cn('min-h-9 rounded-md px-3 font-medium', lang === l ? 'bg-navy-700 text-white' : 'text-slate-600 hover:bg-slate-100')}>{l === 'te' ? 'తెలుగు' : 'English'}</button>
      ))}
    </div>
  );
}

function Shell() {
  const { user, logout, aiMode } = useAuth();
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  const links = [
    { to: '/', icon: LayoutDashboard, label: t('nav_dashboard'), end: true },
    { to: '/grievances', icon: FileText, label: t('nav_grievances') },
    ...(user.role === 'mandal_officer' ? [{ to: '/new', icon: FilePlus2, label: t('nav_new') }] : []),
  ];
  const nav = (
    <nav className="space-y-1 p-3">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)} className={({ isActive }) => cn('flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium', isActive ? 'bg-navy-50 text-navy-700' : 'text-slate-600 hover:bg-slate-100')}>
          <l.icon className="size-4.5" strokeWidth={1.75} />{l.label}
        </NavLink>
      ))}
    </nav>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-white lg:block">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4"><Landmark className="size-6 text-navy-700" /><div><div className="font-bold leading-tight text-navy-800">{t('app_name')}</div><div className="text-xs text-slate-500">{t('app_tag')}</div></div></div>
        {nav}
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)}><aside className="h-full w-64 bg-white" onClick={(e) => e.stopPropagation()}>{nav}</aside></div>}
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur">
          <button className="min-h-11 min-w-11 rounded-lg hover:bg-slate-100 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="mx-auto size-5" /> : <Menu className="mx-auto size-5" />}</button>
          <div className="min-w-0 flex-1 truncate text-sm"><span className="font-semibold">{lang === 'te' ? user.nameTe : user.name}</span> <span className="hidden text-slate-500 sm:inline">· {t('role_' + user.role)}</span></div>
          <span className={cn('hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium md:inline-flex', aiMode === 'demo' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}><FlaskConical className="size-3.5" />{aiMode === 'demo' ? 'AI: DEMO' : 'AI: Claude'}</span>
          <LangSwitch />
          <button onClick={logout} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-slate-600 hover:bg-slate-100"><LogOut className="size-4" /><span className="hidden sm:inline">{t('logout')}</span></button>
        </header>
        <div className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">{t('demo_notice')}</div>
        <main className="w-full p-4 sm:p-6 lg:px-8 fade-in"><Outlet /></main>
      </div>
    </div>
  );
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <div className="p-10"><Skeleton className="h-10 w-64" /></div>;
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="grievances" element={<Grievances />} />
        <Route path="new" element={<NewGrievance />} />
        <Route path="grievances/:id" element={<Detail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
