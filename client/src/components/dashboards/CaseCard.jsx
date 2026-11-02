import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2, MapPin, Timer } from 'lucide-react';
import { Card } from '../common/Card.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { formatDate, formatDistance } from '../../utils/format.js';

export function CaseCard({ item, detailHref, compact = false }) {
  return <Card className="transition hover:border-slate-300">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-slate-400">{item.reference}</p><h3 className="mt-1 text-base font-semibold text-slate-900">{item.locationLabel}</h3></div><StatusBadge status={item.status} /></div>
    <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2"><p className="flex items-center gap-2"><MapPin size={15} className="shrink-0 text-teal-700" />{formatDistance(item.ambulance?.distanceKm)}{item.ambulance ? ` · ${item.ambulance.callSign}` : ' · No ambulance'}</p><p className="flex items-center gap-2"><Building2 size={15} className="shrink-0 text-slate-400" />{item.hospital?.name || 'No hospital confirmed'}</p></div>
    {!compact && <p className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Timer size={14} />Updated {formatDate(item.updatedAt)}</p>}
    {detailHref && <Link to={detailHref} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-teal-800 hover:text-teal-950">Open case <ArrowUpRight size={15} /></Link>}
  </Card>;
}
