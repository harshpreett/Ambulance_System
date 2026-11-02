import { useCallback, useEffect, useState } from 'react';
import { BedDouble, Building2, Check, RefreshCw, Stethoscope } from 'lucide-react';
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
import { FormField, inputClass } from '../../components/common/FormField.jsx';
import { formatDate, formatDistance, titleCase } from '../../utils/format.js';

const bedLabels = { EMERGENCY: 'Emergency', ICU: 'ICU', VENTILATOR: 'Ventilator' };

export function HospitalDashboardPage() {
  const load = useCallback(async () => (await api.get('/hospital/dashboard')).data, []);
  const { data, loading, error: loadError, refresh } = usePolling(load, 10000);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(null);
  useEffect(() => {
    if (data?.beds) setDrafts(Object.fromEntries(data.beds.map((bed) => [bed.bedType, String(bed.totalCount)])));
  }, [data?.beds]);

  async function saveBed(bedType) {
    setBusy(true); setError(''); setNotice('');
    try {
      await api.put(`/hospital/beds/${bedType}`, { totalCount: Number(drafts[bedType]) });
      setNotice(`${bedLabels[bedType]} sample capacity updated.`); refresh();
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function decide() {
    if (!confirm) return;
    setBusy(true); setError('');
    try {
      await api.post(`/hospital/proposals/${confirm.item.proposalId}/decision`, { decision: confirm.decision, reason: confirm.decision === 'DECLINE' ? 'Facility cannot accept this sample case.' : undefined });
      setConfirm(null); refresh();
    } catch (requestError) { setError(errorMessage(requestError)); setConfirm(null); refresh(); }
    finally { setBusy(false); }
  }

  const pending = data?.proposals?.filter((proposal) => proposal.proposalState === 'PENDING') || [];
  const confirmed = data?.proposals?.filter((proposal) => proposal.proposalState === 'ACCEPTED') || [];
  const openBeds = (data?.beds || []).reduce((sum, bed) => sum + Math.max(0, bed.totalCount - bed.heldCount), 0);
  return <>
    <PageHeading eyebrow="Hospital workspace" title={data?.hospital?.name || 'Hospital desk'} description="Review sample incoming cases and maintain this facility’s demonstration capacity." action={<Button variant="secondary" onClick={refresh}><RefreshCw size={16} /> Refresh</Button>} />
    <Alert variant="info" className="mb-5"><strong>Sample capacity only.</strong> These counts are not connected to a real hospital system and do not reserve real beds.</Alert>
    {(error || loadError) && <Alert variant="error" className="mb-5">{error || loadError}</Alert>}{notice && <Alert variant="success" className="mb-5">{notice}</Alert>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="Pending proposals" value={loading ? '…' : pending.length} caption="Waiting for a readiness decision" icon={Stethoscope} tone="amber" /><StatCard label="Confirmed cases" value={loading ? '…' : confirmed.length} caption="Active hospital proposals" icon={Check} tone="blue" /><StatCard label="Sample open capacity" value={loading ? '…' : openBeds} caption="Across the listed bed categories" icon={BedDouble} tone="teal" /></div>
    <section className="mt-7"><CardTitle subtitle="Confirm only when this sample facility is ready to receive the case.">Incoming proposals</CardTitle>{loading ? <p className="text-sm text-slate-500">Loading proposals…</p> : pending.length === 0 ? <EmptyState title="No pending proposals" description="New sample cases will appear here as they are matched." /> : <div className="grid gap-4 xl:grid-cols-2">{pending.map((item) => <ProposalCard key={item.proposalId} item={item} onDecision={(decision) => setConfirm({ item, decision })} />)}</div>}</section>
    <section className="mt-8"><CardTitle subtitle="A readiness confirmation keeps the sample capacity held until the case is completed or cancelled.">Confirmed cases</CardTitle>{confirmed.length === 0 ? <EmptyState title="No confirmed cases" description="Confirmed hospital proposals will be listed here." /> : <div className="grid gap-4 xl:grid-cols-2">{confirmed.map((item) => <ProposalCard key={item.proposalId} item={item} confirmed />)}</div>}</section>
    <section className="mt-8"><Card className="max-w-3xl"><CardTitle subtitle="Updates are timestamped and applied only to demo matching.">Sample bed availability</CardTitle>{loading ? <p className="text-sm text-slate-500">Loading bed counts…</p> : <div className="divide-y divide-slate-100">{(data?.beds || []).map((bed) => <div key={bed.id} className="grid gap-3 py-4 first:pt-0 sm:grid-cols-[1fr_10rem_auto] sm:items-end"><div><p className="text-sm font-semibold text-slate-800">{bedLabels[bed.bedType] || titleCase(bed.bedType)} beds</p><p className="mt-1 text-xs text-slate-500">{Math.max(0, bed.totalCount - bed.heldCount)} available · {bed.heldCount} held by demo cases · updated {formatDate(bed.updatedAt)}</p></div><FormField label="Total sample capacity" id={`bed-${bed.bedType}`}><input id={`bed-${bed.bedType}`} type="number" min={bed.heldCount} max="10000" className={inputClass} value={drafts[bed.bedType] ?? bed.totalCount} onChange={(event) => setDrafts((current) => ({ ...current, [bed.bedType]: event.target.value }))} /></FormField><Button variant="secondary" loading={busy} onClick={() => saveBed(bed.bedType)}>Save count</Button></div>)}</div>}</Card></section>
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.decision === 'ACCEPT' ? 'Confirm hospital readiness?' : 'Decline this proposal?'} description={confirm?.decision === 'ACCEPT' ? `This confirms ${confirm?.item?.reference} for ${confirm?.item?.locationLabel}. A temporary sample capacity hold will remain until the case is closed.` : `Decline ${confirm?.item?.reference}. The system will try the next compatible sample hospital.`} confirmLabel={confirm?.decision === 'ACCEPT' ? 'Confirm readiness' : 'Decline proposal'} busy={busy} onClose={() => setConfirm(null)} onConfirm={decide} />
  </>;
}

function ProposalCard({ item, onDecision, confirmed = false }) {
  return <Card className={confirmed ? '' : 'border-amber-200/80'}><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-mono text-xs font-semibold text-slate-400">{item.reference}</p><h3 className="mt-1 text-lg font-semibold text-slate-900">{item.locationLabel}</h3></div><StatusBadge status={confirmed ? 'ACCEPTED' : 'OFFERED'} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Requirements</p><p className="mt-1 text-sm font-semibold text-slate-800">{item.requirements.length ? item.requirements.map(titleCase).join(', ') : 'Emergency response'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Approximate distance</p><p className="mt-1 text-sm font-semibold text-slate-800">{formatDistance(item.hospital?.distanceKm)} · about {item.hospital?.etaMinutes ?? '—'} min</p></div></div><p className="mt-3 text-xs text-slate-500">Case opened {formatDate(item.createdAt)}. Provider views contain limited caller data.</p>{!confirmed && <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => onDecision('DECLINE')}>Decline</Button><Button onClick={() => onDecision('ACCEPT')}>Confirm readiness</Button></div>}</Card>;
}
