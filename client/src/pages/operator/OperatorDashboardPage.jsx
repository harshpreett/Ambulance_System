import { useCallback, useState } from 'react';
import { ExternalLink, MapPin, Route, ShieldAlert, Timer } from 'lucide-react';
import { api, errorMessage } from '../../services/api.js';
import { usePolling } from '../../hooks/usePolling.js';
import { PageHeading } from '../../components/dashboards/PageHeading.jsx';
import { StatCard } from '../../components/dashboards/StatCard.jsx';
import { Card, CardTitle } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { formatDate, formatDistance, mapsLink, titleCase } from '../../utils/format.js';

const nextStatus = {
  ACCEPTED: ['EN_ROUTE_TO_CALLER', 'Start trip to caller'],
  EN_ROUTE_TO_CALLER: ['PATIENT_PICKED_UP', 'Mark patient picked up'],
  PATIENT_PICKED_UP: ['EN_ROUTE_TO_HOSPITAL', 'Start trip to hospital'],
  EN_ROUTE_TO_HOSPITAL: ['HANDOVER_COMPLETE', 'Complete handover'],
  HANDOVER_COMPLETE: ['CLOSED', 'Close case'],
};

export function OperatorDashboardPage() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const load = useCallback(async () => (await api.get('/operator/dashboard')).data, []);
  const { data, loading, refresh } = usePolling(load, 10000);

  async function runAction() {
    if (!confirm) return;
    setBusy(true); setError('');
    try {
      if (confirm.kind === 'decision') await api.post(`/operator/assignments/${confirm.item.assignmentId}/decision`, { decision: confirm.decision, reason: confirm.decision === 'DECLINE' ? 'Operator is unavailable for this demo offer.' : undefined });
      else await api.post(`/operator/requests/${encodeURIComponent(confirm.item.reference)}/trip-status`, { status: confirm.status });
      setConfirm(null); refresh();
    } catch (requestError) { setError(errorMessage(requestError)); setConfirm(null); refresh(); }
    finally { setBusy(false); }
  }

  const offers = data?.offers || [];
  const trips = data?.activeTrips || [];
  return <>
    <PageHeading eyebrow="Operator workspace" title="My dispatches" description="Review sample offers and update a case as the demo trip progresses." action={<Button variant="secondary" onClick={refresh}><Route size={16} /> Refresh</Button>} />
    <Alert variant="info" className="mb-5"><strong>Training/demo view.</strong> Locations, ETAs and trip actions use synthetic project data; no vehicle is being tracked.</Alert>
    {error && <Alert variant="error" className="mb-5">{error}</Alert>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="Incoming offers" value={loading ? '…' : offers.length} caption="Waiting for an operator response" icon={Timer} tone="amber" /><StatCard label="Active trips" value={loading ? '…' : trips.length} caption="Cases assigned to this vehicle" icon={Route} tone="blue" /><StatCard label="Ambulance" value={data?.ambulance?.callSign || '—'} caption={data?.ambulance?.type || 'No vehicle linked'} icon={MapPin} tone="teal" /></div>
    <section className="mt-7"><CardTitle subtitle="New assignments stay pending until you accept.">Incoming offers</CardTitle>{loading ? <p className="text-sm text-slate-500">Loading offers…</p> : offers.length === 0 ? <EmptyState title="No offers right now" description="The dashboard checks for new sample assignments automatically." /> : <div className="grid gap-4 xl:grid-cols-2">{offers.map((item) => <OfferCard key={item.assignmentId} item={item} onDecision={(decision) => setConfirm({ kind: 'decision', decision, item })} />)}</div>}</section>
    <section className="mt-8"><CardTitle subtitle="Advance one valid step at a time. Hospital readiness is required before starting the trip.">Active trip</CardTitle>{loading ? <p className="text-sm text-slate-500">Loading trip…</p> : trips.length === 0 ? <EmptyState title="No active trip" description="Accepted assignments will appear here." /> : <div className="space-y-4">{trips.map((item) => <TripCard key={item.assignmentId} item={item} onAdvance={(status) => setConfirm({ kind: 'status', status, item })} />)}</div>}</section>
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.kind === 'decision' ? `${confirm.decision === 'ACCEPT' ? 'Accept' : 'Decline'} this offer?` : `Update case status?`} description={confirm?.kind === 'decision' ? (confirm.decision === 'ACCEPT' ? `Accept case ${confirm.item?.reference} for ${confirm.item?.locationLabel}. This is a demo assignment.` : `Decline case ${confirm.item?.reference}. The system will try the next eligible sample ambulance.`) : `Move ${confirm?.item?.reference} to ${titleCase(confirm?.status)}? This update will be recorded in the case timeline.`} confirmLabel="Confirm update" busy={busy} onClose={() => setConfirm(null)} onConfirm={runAction} />
  </>;
}

function OfferCard({ item, onDecision }) {
  const isConfirmed = item.hospital?.proposalState === 'ACCEPTED';
  return <Card className="border-amber-200/80">
    <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-slate-400">{item.reference}</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{item.locationLabel}</h3></div><StatusBadge status="OFFERED" /></div>
    <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3.5 sm:grid-cols-2"><div><p className="text-xs text-slate-400">Approximate distance</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatDistance(item.ambulance?.distanceKm)} · about {item.ambulance?.etaMinutes ?? '—'} min</p></div><div><p className="text-xs text-slate-400">Destination proposal</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.hospital?.name || 'Awaiting review'}</p></div></div>
    <p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><MapPin size={15} />{item.locationLabel}</p>
    {item.caller?.name && <p className="mt-2 text-sm text-slate-600">Demo caller: {item.caller.name}{item.caller.phone ? ` · ${item.caller.phone}` : ''}</p>}
    <p className="mt-3 text-xs text-slate-500">Requirements: {item.requirements.length ? item.requirements.map(titleCase).join(', ') : 'Emergency response'}</p>
    <p className={`mt-3 text-xs ${isConfirmed ? 'text-emerald-700' : 'text-amber-800'}`}>{isConfirmed ? 'Hospital readiness confirmed.' : 'Hospital confirmation is pending.'} · Offer expires {formatDate(item.ambulance?.expiresAt)}</p>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><a className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:text-teal-950" href={mapsLink(item.latitude, item.longitude)} target="_blank" rel="noreferrer">Open directions <ExternalLink size={14} /></a><div className="flex gap-2"><Button variant="secondary" onClick={() => onDecision('DECLINE')}>Decline</Button><Button onClick={() => onDecision('ACCEPT')}>Accept offer</Button></div></div>
  </Card>;
}

function TripCard({ item, onAdvance }) {
  const action = nextStatus[item.status];
  const hospitalReady = item.hospital?.proposalState === 'ACCEPTED';
  const disabled = item.status === 'ACCEPTED' && !hospitalReady;
  return <Card>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-slate-400">{item.reference}</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{item.locationLabel}</h3></div><StatusBadge status={item.status} /></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs text-slate-400">Destination</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.hospital?.name || 'No hospital assigned'}</p>{item.hospital && <p className="mt-1 text-xs text-slate-500">{formatDistance(item.hospital.distanceKm)} · {titleCase(item.hospital.proposalState)}</p>}</div><div className="rounded-xl bg-slate-50 p-3.5"><p className="text-xs text-slate-400">Demo estimate</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.hospital?.etaMinutes ?? '—'} min from current sample point</p></div></div>
    {disabled && <Alert className="mt-4" variant="info">Wait for the hospital desk to confirm readiness before starting the trip.</Alert>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><a className="inline-flex items-center gap-1 text-sm font-medium text-teal-800 hover:text-teal-950" href={mapsLink(item.hospital?.latitude || item.latitude, item.hospital?.longitude || item.longitude)} target="_blank" rel="noreferrer">Open map directions <ExternalLink size={14} /></a>{action && <Button disabled={disabled} onClick={() => onAdvance(action[0])}>{action[1]}</Button>}</div>
  </Card>;
}
