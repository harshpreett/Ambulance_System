import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MapPin, RefreshCw, UserRoundCog } from 'lucide-react';
import { api, errorMessage } from '../../services/api.js';
import { usePolling } from '../../hooks/usePolling.js';
import { PageHeading } from '../../components/dashboards/PageHeading.jsx';
import { Card, CardTitle } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { FormField, inputClass } from '../../components/common/FormField.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { Timeline } from '../../components/dashboards/Timeline.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';
import { formatDate, formatDistance, mapsLink, titleCase } from '../../utils/format.js';

export function AdminCaseDetailPage() {
  const { id } = useParams();
  const load = useCallback(async () => (await api.get(`/admin/requests/${id}`)).data.case, [id]);
  const { data: item, loading, error: loadError, refresh } = usePolling(load, 12000);
  const [resources, setResources] = useState(null);
  const [assignment, setAssignment] = useState({ ambulanceId: '', hospitalId: '', reason: 'Administrator assigned compatible sample resources.' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function loadResources() {
    setError('');
    try {
      const [ambulanceResponse, hospitalResponse] = await Promise.all([api.get('/admin/ambulances'), api.get('/admin/hospitals')]);
      setResources({ ambulances: ambulanceResponse.data.ambulances, hospitals: hospitalResponse.data.hospitals });
    } catch (requestError) { setError(errorMessage(requestError)); }
  }

  async function retry() {
    setBusy(true); setError('');
    try { await api.post(`/admin/requests/${id}/retry-matching`); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function assign(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.post(`/admin/requests/${id}/assign`, { ...assignment, ambulanceId: Number(assignment.ambulanceId), hospitalId: Number(assignment.hospitalId), overrideCompatibility: false }); setResources(null); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true); setError('');
    try { await api.post(`/admin/requests/${id}/cancel`, { reason: 'Administrator cancelled the synthetic case.' }); setConfirmCancel(false); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  if (loading && !item) return <p className="text-sm text-slate-500">Loading case…</p>;
  if (!item) return <div><PageHeading title="Case unavailable" description={loadError || 'This case could not be loaded.'} /><Link to="/admin/cases"><Button variant="secondary">Back to cases</Button></Link></div>;

  return <>
    <Link to="/admin/cases" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Back to all cases</Link>
    <PageHeading eyebrow={item.reference} title={item.locationLabel} description={`Created ${formatDate(item.createdAt)} · ${titleCase(item.requestType)}`} action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={refresh}><RefreshCw size={15} /> Refresh</Button>{item.status === 'NEEDS_REVIEW' && <Button variant="secondary" loading={busy} onClick={retry}>Retry matching</Button>}{!['CLOSED', 'CANCELLED'].includes(item.status) && <Button variant="danger" onClick={() => setConfirmCancel(true)}>Cancel case</Button>}</div>} />
    {(error || loadError) && <Alert variant="error" className="mb-5">{error || loadError}</Alert>}
    <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
      <div className="space-y-5"><Card><CardTitle action={<StatusBadge status={item.status} />} subtitle="Resources and requirements for this synthetic case.">Case overview</CardTitle><div className="grid gap-4 sm:grid-cols-2"><Info label="Reference" value={item.reference} /><Info label="Request type" value={titleCase(item.requestType)} /><Info label="Location" value={`${item.locationLabel} (${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)})`} /><Info label="Requirements" value={item.requirements.length ? item.requirements.map(titleCase).join(', ') : 'Emergency response'} /><Info label="Caller name" value={item.caller?.name || 'Not provided'} /><Info label="Caller phone" value={item.caller?.phone || 'Not provided'} /><Info label="Notes" value={item.caller?.notes || 'None'} /></div><a className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-teal-800" href={mapsLink(item.latitude, item.longitude)} target="_blank" rel="noreferrer">Open sample location <ExternalLink size={14} /></a></Card>
        <Card><CardTitle>Assignment history</CardTitle>{item.assignmentHistory.length ? <div className="space-y-3">{item.assignmentHistory.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-semibold text-slate-800">{record.callSign}</p><p className="mt-1 text-xs text-slate-500">Offered {formatDate(record.offeredAt)}{record.reason ? ` · ${record.reason}` : ''}</p></div><StatusBadge status={record.state} /></div>)}</div> : <p className="text-sm text-slate-500">No ambulance offers have been made.</p>}</Card>
        <Card><CardTitle>Hospital proposal history</CardTitle>{item.hospitalHistory.length ? <div className="space-y-3">{item.hospitalHistory.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-semibold text-slate-800">{record.name}</p><p className="mt-1 text-xs text-slate-500">Proposed {formatDate(record.offeredAt)}{record.reason ? ` · ${record.reason}` : ''}</p></div><StatusBadge status={record.state} /></div>)}</div> : <p className="text-sm text-slate-500">No hospital proposals have been made.</p>}</Card>
        {resources && <Card><CardTitle action={<button className="text-sm text-slate-500" onClick={() => setResources(null)}>Close</button>} subtitle="Only compatible available resources are accepted by the server.">Manual assignment</CardTitle><form onSubmit={assign} className="grid gap-4 sm:grid-cols-2"><FormField label="Available ambulance" id="assign-ambulance"><select id="assign-ambulance" className={inputClass} value={assignment.ambulanceId} onChange={(event) => setAssignment({ ...assignment, ambulanceId: event.target.value })} required><option value="">Choose ambulance</option>{resources.ambulances.filter((row) => row.status === 'AVAILABLE' && row.inService).map((row) => <option key={row.id} value={row.id}>{row.callSign} · {row.type} · {row.capabilities.map((item) => item.capability).join(', ')}</option>)}</select></FormField><FormField label="Suitable hospital" id="assign-hospital"><select id="assign-hospital" className={inputClass} value={assignment.hospitalId} onChange={(event) => setAssignment({ ...assignment, hospitalId: event.target.value })} required><option value="">Choose hospital</option>{resources.hospitals.filter((row) => row.active && row.emergencyEnabled).map((row) => <option key={row.id} value={row.id}>{row.name} · {row.ownership}</option>)}</select></FormField><FormField label="Reason" id="assign-reason" className="sm:col-span-2"><input id="assign-reason" className={inputClass} minLength="3" maxLength="300" value={assignment.reason} onChange={(event) => setAssignment({ ...assignment, reason: event.target.value })} required /></FormField>{error && <Alert variant="error" className="sm:col-span-2">{error}</Alert>}<div className="sm:col-span-2"><Button type="submit" loading={busy}><UserRoundCog size={16} /> Assign selected resources</Button></div></form></Card>}
      </div>
      <div className="space-y-5"><Card><CardTitle>Current assignment</CardTitle>{item.ambulance ? <Resource label={item.ambulance.callSign} sub={`${item.ambulance.type} · ${formatDistance(item.ambulance.distanceKm)} · ${item.ambulance.etaMinutes} min estimate`} status={item.ambulance.assignmentState} /> : <p className="text-sm text-slate-500">No current ambulance assignment.</p>}</Card><Card><CardTitle>Current hospital</CardTitle>{item.hospital ? <Resource label={item.hospital.name} sub={`${formatDistance(item.hospital.distanceKm)} · ${item.hospital.etaMinutes} min estimate`} status={item.hospital.proposalState} /> : <p className="text-sm text-slate-500">No current hospital proposal.</p>}</Card><Card><CardTitle>Case timeline</CardTitle><Timeline events={item.timeline} /></Card><Button variant="secondary" className="w-full" onClick={loadResources}>Open manual assignment <MapPin size={15} /></Button></div>
    </div>
    <ConfirmDialog open={confirmCancel} title="Cancel this demo case?" description="Current ambulance offers and sample hospital capacity holds will be released. The action will be recorded in audit history." confirmLabel="Cancel case" danger busy={busy} onClose={() => setConfirmCancel(false)} onConfirm={cancel} />
  </>;
}

function Info({ label, value }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 break-words text-sm text-slate-800">{value}</p></div>; }
function Resource({ label, sub, status }) { return <div><p className="font-semibold text-slate-900">{label}</p><p className="mt-1 text-sm text-slate-500">{sub}</p><div className="mt-3"><StatusBadge status={status} /></div></div>; }
