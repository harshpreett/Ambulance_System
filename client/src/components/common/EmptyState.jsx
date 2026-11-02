import { Inbox } from 'lucide-react';

export function EmptyState({ title = 'Nothing to show yet', description = 'New activity will appear here when it is available.' }) {
  return <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
    <span className="mb-3 grid size-10 place-items-center rounded-full bg-white text-slate-400 shadow-sm"><Inbox size={19} /></span>
    <h3 className="text-sm font-semibold text-slate-700">{title}</h3><p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
  </div>;
}
