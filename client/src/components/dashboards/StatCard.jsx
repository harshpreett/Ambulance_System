import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function StatCard({ label, value, caption, icon: Icon, tone = 'teal' }) {
  const tones = { teal: 'bg-teal-50 text-teal-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' };
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.025]"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value ?? '—'}</p></div><span className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span></div>{caption && <p className="mt-3 flex items-center gap-1 text-xs text-slate-400"><ArrowUpRight size={13} />{caption}</p>}</div>;
}
