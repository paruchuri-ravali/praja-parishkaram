import { useState, type ReactNode } from 'react';
import { Sparkles, FlaskConical } from 'lucide-react';
import { api, errKey } from '../api';
import { useI18n } from '../i18n';
import { Button, cn } from './ui';

export type AiEnv<T> = { mode: 'live' | 'demo'; result: T };

export function useAi<T>(path: string) {
  const { t } = useI18n();
  const [data, setData] = useState<AiEnv<T> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const run = async (body: unknown) => {
    setLoading(true); setError(''); setData(null);
    try { setData(await api<AiEnv<T>>(path, { method: 'POST', body })); }
    catch (e) { setError(t(errKey(e))); }
    finally { setLoading(false); }
  };
  return { data, loading, error, run, clear: () => setData(null) };
}

export function AiLabel({ mode }: { mode: 'live' | 'demo' }) {
  const { t } = useI18n();
  return (
    <div className="space-y-1 text-xs">
      <div className={cn('flex items-center gap-1.5 rounded-md px-2 py-1 font-medium', mode === 'demo' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-50 text-emerald-800')}>
        {mode === 'demo' ? <FlaskConical className="size-3.5" /> : <Sparkles className="size-3.5" />}{mode === 'demo' ? t('ai_demo') : t('ai_live')}
      </div>
      <div className="text-slate-500">{t('ai_suggestion_label')}</div>
    </div>
  );
}

/** Wrapper: a button that runs an AI call and shows the labelled, editable-by-officer result. */
export function AiBlock<T>({ title, ai, onRun, children, className }: { title?: string; ai: ReturnType<typeof useAi<T>>; onRun: () => void; children: (r: T) => ReactNode; className?: string }) {
  const { t } = useI18n();
  return (
    <div className={cn('space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-violet-900"><Sparkles className="size-4" />{title ?? t('ai_panel')}</span>
        <Button type="button" size="sm" variant="outline" onClick={onRun} loading={ai.loading}>{ai.loading ? t('ai_running') : t('ai_run')}</Button>
      </div>
      {ai.error && <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-700">{ai.error}</p>}
      {ai.data && (<div className="space-y-3 fade-in"><AiLabel mode={ai.data.mode} />{children(ai.data.result)}</div>)}
      <p className="text-[11px] text-slate-500">{t('ai_never')}</p>
    </div>
  );
}

export const List = ({ items, empty }: { items: string[]; empty: string }) =>
  items.length ? <ul className="list-disc space-y-0.5 pl-5 text-sm">{items.map((i, k) => <li key={k}>{i}</li>)}</ul> : <p className="text-sm text-slate-500">{empty}</p>;

/** Original text + separately shown translation. Never overwrites the original. */
export function TranslateBox({ text, lang }: { text: string; lang: 'te' | 'en' }) {
  const { t } = useI18n();
  const ai = useAi<{ translation: string; target: string }>('/ai/translate');
  const target = lang === 'te' ? 'en' : 'te';
  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="outline" loading={ai.loading} onClick={() => ai.run({ text, target })}>{target === 'en' ? t('ai_translate_en') : t('ai_translate_te')}</Button>
      {ai.error && <p role="alert" className="text-sm text-red-700">{ai.error}</p>}
      {ai.data && <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3 fade-in"><AiLabel mode={ai.data.mode} /><div className="text-xs font-medium text-slate-500">{t('ai_translation')}</div><p className="whitespace-pre-wrap text-sm">{ai.data.result.translation}</p></div>}
    </div>
  );
}
