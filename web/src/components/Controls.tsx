import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Label } from '@/components/shadcn/label';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const ALL = '__all__';
export type Opt = { value: string; label: string };

/** shadcn Select. `allLabel` adds an "all/none" entry that maps to the empty string. */
export function Dropdown({ value, onChange, options, placeholder, allLabel, ariaLabel, className }: { value: string; onChange: (v: string) => void; options: Opt[]; placeholder?: string; allLabel?: string; ariaLabel?: string; className?: string }) {
  return (
    <Select value={value === '' ? (allLabel ? ALL : undefined) : value} onValueChange={(v) => onChange(v === ALL ? '' : v)}>
      <SelectTrigger aria-label={ariaLabel} className={cn('min-h-11 w-full bg-white text-sm', className)}><SelectValue placeholder={placeholder ?? allLabel} /></SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function CheckRow({ checked, onChange, children, className }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; className?: string }) {
  return (
    <Label className={cn('flex min-h-11 cursor-pointer items-center gap-3 text-sm font-normal', className)}>
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="size-5" />{children}
    </Label>
  );
}

export function RadioCards({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Opt[] }) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <Label key={o.value} className={cn('flex min-h-12 cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-normal', value === o.value ? 'border-navy-600 bg-navy-50' : 'border-slate-300 bg-white')}>
          <RadioGroupItem value={o.value} />{o.label}
        </Label>
      ))}
    </RadioGroup>
  );
}

export function ConfirmDialog({ open, onOpenChange, title, description, children, footer }: { open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; children?: ReactNode; footer: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
        {children}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
