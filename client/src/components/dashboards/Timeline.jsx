import { CircleCheck, CircleDot } from 'lucide-react';
import { formatDate, titleCase } from '../../utils/format.js';

export function Timeline({ events = [] }) {
  if (!events.length) return <p className="text-sm text-slate-500">No case history has been recorded.</p>;
  return <ol className="space-y-4">{events.map((event, index) => <li key={`${event.status}-${index}`} className="relative flex gap-3.5">
    <span className="relative z-10 grid size-7 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">{index === events.length - 1 ? <CircleDot size={17} /> : <CircleCheck size={16} />}</span>
    {index < events.length - 1 && <span className="absolute bottom-[-1rem] left-[13px] top-7 w-px bg-slate-200" />}
    <div className="min-w-0 flex-1 pb-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{titleCase(event.status)}</p><time className="text-xs text-slate-400">{formatDate(event.createdAt)}</time></div>{event.note && <p className="mt-1 text-sm leading-5 text-slate-500">{event.note}</p>}{event.actor && <p className="mt-1 text-xs text-slate-400">{event.actor}</p>}</div>
  </li>)}</ol>;
}
