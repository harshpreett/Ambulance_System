import { LoaderCircle } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }) {
  return <div role="status" className="flex min-h-44 items-center justify-center gap-3 text-sm font-medium text-slate-500"><LoaderCircle size={19} className="animate-spin text-teal-700" />{label}</div>;
}
