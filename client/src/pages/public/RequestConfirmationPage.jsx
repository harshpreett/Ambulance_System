import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Check, Clipboard, KeyRound, MapPin, ShieldCheck } from 'lucide-react';
import { PublicShell } from './RequestFormPage.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Card } from '../../components/common/Card.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { formatDistance, titleCase } from '../../utils/format.js';

export function RequestConfirmationPage() {
  const { state } = useLocation();
  const [copied, setCopied] = useState(false);
  const item = state?.case;
  if (!item) return <Navigate to="/request/emergency" replace />;

  async function copy(value) {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return <PublicShell><div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
    <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-teal-100 text-teal-800"><ShieldCheck size={27} /></div>
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Demo request submitted</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Your sample case is ready to follow.</h1>
    <p className="mt-3 leading-6 text-slate-600">This case is in the coordination demo. A displayed offer is not a real dispatch.</p>
    <Card className="mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Case reference</p><p className="mt-1 font-mono text-xl font-bold tracking-wide text-slate-900">{item.reference}</p></div><StatusBadge status={item.status} /></div><div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><div><p className="text-xs font-medium text-slate-400">Location</p><p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-800"><MapPin size={15} className="text-teal-700" />{item.locationLabel}</p></div><div><p className="text-xs font-medium text-slate-400">Requirements</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.requirements.length ? item.requirements.map(titleCase).join(', ') : 'Emergency support'}</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs font-medium text-slate-400">Ambulance offer</p><p className="mt-1 text-sm font-semibold text-slate-900">{item.ambulance ? `${item.ambulance.callSign} · ${formatDistance(item.ambulance.distanceKm)}` : 'Needs administrator review'}</p><p className="mt-1 text-xs text-slate-500">{item.ambulance ? 'Awaiting operator acceptance' : 'No resource is confirmed'}</p></div><div className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs font-medium text-slate-400">Hospital proposal</p><p className="mt-1 text-sm font-semibold text-slate-900">{item.hospital?.name || 'Needs administrator review'}</p><p className="mt-1 text-xs text-slate-500">{item.hospital ? `${formatDistance(item.hospital.distanceKm)} · awaiting readiness confirmation` : 'No facility is confirmed'}</p></div></div>
    </Card>
    {item.status === 'NEEDS_REVIEW' ? <Alert variant="error" className="mt-4">The demo could not confirm all required sample resources. The case is visible to the demo administrator.</Alert> : <Alert variant="info" className="mt-4">An ambulance is not considered dispatched until its operator accepts the offer. Hospital readiness is confirmed separately.</Alert>}
    <Card className="mt-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><KeyRound size={18} /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-900">Save your private lookup token</h2><p className="mt-1 text-sm leading-5 text-slate-600">Use this token with the case reference to check the demo status. It will not be shown again.</p><p className="mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">{item.lookupToken}</p><Button variant="secondary" className="mt-3" onClick={() => copy(item.lookupToken)}>{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? 'Copied' : 'Copy token'}</Button></div></div></Card>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link to="/request/status" state={{ reference: item.reference, lookupToken: item.lookupToken }}><Button>Check case status</Button></Link><Link to="/"><Button variant="secondary">Return to overview</Button></Link></div>
  </div></PublicShell>;
}
