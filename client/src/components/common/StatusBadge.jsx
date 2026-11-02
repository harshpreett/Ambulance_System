import { titleCase } from '../../utils/format.js';

const tones = {
  OFFERED: 'bg-amber-50 text-amber-800 ring-amber-200',
  ACCEPTED: 'bg-blue-50 text-blue-800 ring-blue-200',
  NEEDS_REVIEW: 'bg-rose-50 text-rose-800 ring-rose-200',
  CLOSED: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
  EN_ROUTE_TO_CALLER: 'bg-cyan-50 text-cyan-800 ring-cyan-200',
  PATIENT_PICKED_UP: 'bg-indigo-50 text-indigo-800 ring-indigo-200',
  EN_ROUTE_TO_HOSPITAL: 'bg-violet-50 text-violet-800 ring-violet-200',
  HANDOVER_COMPLETE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

export function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tones[status] || 'bg-slate-50 text-slate-700 ring-slate-200'}`}>{titleCase(status || 'Unknown')}</span>;
}
