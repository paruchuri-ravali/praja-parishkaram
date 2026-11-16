import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useI18n } from '../i18n';

export const cn = (...i: ClassValue[]) => twMerge(clsx(i));

const btn = cva('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-500 min-h-11 px-4 text-sm', {
  variants: { variant: { primary: 'bg-navy-700 text-white hover:bg-navy-800', outline: 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-700', danger: 'bg-red-600 text-white hover:bg-red-700', success: 'bg-emerald-600 text-white hover:bg-emerald-700', ghost: 'hover:bg-slate-100 text-slate-700', amber: 'bg-amber-500 text-white hover:bg-amber-600' }, size: { md: '', lg: 'min-h-12 px-5 text-base', sm: 'min-h-9 px-3 text-xs' } },
  defaultVariants: { variant: 'primary', size: 'md' },
});
export function Button({ className, variant, size, loading, children, disabled, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof btn> & { loading?: boolean }) {
  return <button className={cn(btn({ variant, size }), className)} disabled={disabled || loading} {...p}>{loading && <Loader2 className="size-4 animate-spin" />}{children}</button>;
}
export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...p} />;
export const CardHeader = ({ title, icon, right }: { title: ReactNode; icon?: ReactNode; right?: ReactNode }) => (
  <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3"><h2 className="flex items-center gap-2 font-semibold text-navy-800">{icon}{title}</h2>{right}</div>
);
const fieldCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 min-h-11 text-sm focus:border-navy-500 focus:outline-2 focus:outline-navy-200';
export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn(fieldCls, className)} {...p} />;
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(fieldCls, className)} {...p} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn(fieldCls, 'py-2', className)} {...p} />;
export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="block space-y-1"><span className="text-sm font-medium text-slate-700">{label}</span>{children}{error && <span role="alert" className="block text-xs text-red-600">{error}</span>}</label>;
}

const STATUS_CLS: Record<string, string> = {
  registered: 'bg-slate-100 text-slate-700', awaiting_field_verification: 'bg-sky-100 text-sky-800', awaiting_officer_review: 'bg-indigo-100 text-indigo-800',
  awaiting_final_decision: 'bg-violet-100 text-violet-800', returned: 'bg-amber-100 text-amber-800', approved: 'bg-emerald-100 text-emerald-800', rejected: 'bg-red-100 text-red-800',
};
export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', STATUS_CLS[status])}>{t('st_' + status)}</span>;
}
const PR: Record<string, string> = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-800', low: 'bg-slate-100 text-slate-600' };
export function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useI18n();
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', PR[priority])}><span className={cn('size-1.5 rounded-full', priority === 'high' ? 'bg-red-500' : priority === 'medium' ? 'bg-amber-500' : 'bg-slate-400')} />{t('pr_' + priority)}</span>;
}
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('animate-pulse rounded-md bg-slate-200', className)} />;
export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useI18n();
  return <Card className="p-8 text-center"><p className="text-red-700">{t('error_load')}</p>{onRetry && <Button className="mt-3" variant="outline" onClick={onRetry}>{t('retry')}</Button>}</Card>;
}
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return <div className="p-10 text-center"><p className="font-medium text-slate-700">{title}</p>{hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}</div>;
}
export const fmtDate = (d: string | Date, lang: string) => new Date(d).toLocaleDateString(lang === 'te' ? 'te-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtDateTime = (d: string | Date, lang: string) => new Date(d).toLocaleString(lang === 'te' ? 'te-IN' : 'en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const dateOnly = (d: string) => d?.slice(0, 10);
