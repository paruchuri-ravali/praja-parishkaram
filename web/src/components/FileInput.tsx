import { useRef, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { Button } from './ui';

export type FileItem = { fileName: string; mimeType: string; dataBase64: string };
const OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function FileInput({ files, onChange, label }: { files: FileItem[]; onChange: (f: FileItem[]) => void; label: string }) {
  const { t } = useI18n(); const ref = useRef<HTMLInputElement>(null); const [err, setErr] = useState('');
  const pick = async (list: FileList | null) => {
    if (!list) return; setErr(''); const out = [...files];
    for (const f of Array.from(list)) {
      if (out.length >= 5 || !OK.includes(f.type) || f.size > 2 * 1024 * 1024) { setErr(t('v_file')); continue; }
      const b64 = await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(f); });
      out.push({ fileName: f.name, mimeType: f.type, dataBase64: b64 });
    }
    onChange(out); if (ref.current) ref.current.value = '';
  };
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-700">{label}</div>
      <input ref={ref} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" capture={undefined} className="hidden" onChange={(e) => pick(e.target.files)} />
      <Button type="button" variant="outline" onClick={() => ref.current?.click()}><Paperclip className="size-4" />{t('add_files')}</Button>
      {err && <p role="alert" className="text-xs text-red-600">{err}</p>}
      <ul className="space-y-1">{files.map((f, i) => <li key={i} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1 text-sm"><span className="truncate">{f.fileName}</span><button type="button" aria-label="remove" className="p-1" onClick={() => onChange(files.filter((_, k) => k !== i))}><X className="size-4" /></button></li>)}</ul>
    </div>
  );
}
