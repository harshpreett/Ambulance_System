import { useCallback, useState } from 'react';
import { Ambulance, Pencil, Plus, Power, RefreshCw } from 'lucide-react';
import { api, errorMessage } from '../../services/api.js';
import { usePolling } from '../../hooks/usePolling.js';
import { PageHeading } from '../../components/dashboards/PageHeading.jsx';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { FormField, inputClass } from '../../components/common/FormField.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';

const capabilityOptions = ['icu', 'ventilator', 'oxygen', 'cardiac_support', 'paramedic', 'stretcher', 'neonatal_care'];
const emptyForm = { callSign: '', type: 'ALS', status: 'AVAILABLE', latitude: '30.7333', longitude: '76.7794', capabilities: ['oxygen', 'paramedic', 'stretcher'] };

export function AdminAmbulancesPage() {
  const load = useCallback(async () => (await api.get('/admin/ambulances')).data.ambulances, []);
  const { data = [], loading, error: loadError, refresh } = usePolling(load, 15000);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deactivate, setDeactivate] = useState(null);

  function startCreate() { setEditing(null); setForm(emptyForm); setError(''); setModal(true); }
  function startEdit(item) { setEditing(item); setForm({ callSign: item.callSign, type: item.type, status: item.inService ? 'AVAILABLE' : 'OUT_OF_SERVICE', latitude: String(item.latitude), longitude: String(item.longitude), capabilities: item.capabilities.map((row) => row.capability) }); setError(''); setModal(true); }
  function toggleCapability(capability) { setForm((current) => ({ ...current, capabilities: current.capabilities.includes(capability) ? current.capabilities.filter((item) => item !== capability) : [...current.capabilities, capability] })); }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), inService: form.status === 'AVAILABLE' };
    try { if (editing) await api.put(`/admin/ambulances/${editing.id}`, body); else await api.post('/admin/ambulances', body); setModal(false); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function confirmDeactivate() {
    setBusy(true); setError('');
    try { await api.delete(`/admin/ambulances/${deactivate.id}`); setDeactivate(null); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); setDeactivate(null); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading eyebrow="Administration" title="Ambulance fleet" description="Manage the synthetic fleet and the capabilities used by the matching rules." action={<div className="flex gap-2"><Button variant="secondary" onClick={refresh}><RefreshCw size={16} /> Refresh</Button><Button onClick={startCreate}><Plus size={16} /> Add ambulance</Button></div>} />
    {(error || loadError) && <Alert variant="error" className="mb-4">{error || loadError}</Alert>}
    {loading ? <p className="text-sm text-slate-500">Loading fleet…</p> : data.length === 0 ? <EmptyState title="No ambulances yet" description="Add sample vehicles to make requests matchable." /> : <div className="grid gap-4 xl:grid-cols-2">{data.map((item) => <Card key={item.id}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-800"><Ambulance size={19} /></span><div><h2 className="font-semibold text-slate-900">{item.callSign}</h2><p className="text-sm text-slate-500">{item.type} · {item.operator?.name || 'No operator account'}</p></div></div><StatusBadge status={item.inService ? item.status : 'CANCELLED'} /></div><div className="mt-4 flex flex-wrap gap-1.5">{item.capabilities.map(({ capability }) => <span key={capability} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{capability.replaceAll('_', ' ')}</span>)}</div><p className="mt-3 text-xs text-slate-400">Sample location: {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)} · {item.assignments.length ? 'Has active case' : 'No active case'}</p><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" disabled={Boolean(item.assignments.length)} onClick={() => startEdit(item)}><Pencil size={15} /> Edit</Button><Button variant="quiet" disabled={!item.inService || Boolean(item.assignments.length)} onClick={() => setDeactivate(item)}><Power size={15} /> Deactivate</Button></div></Card>)}</div>}
    <Modal open={modal} title={editing ? `Edit ${editing.callSign}` : 'Add sample ambulance'} onClose={() => !busy && setModal(false)}><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><FormField label="Call sign" id="call-sign"><input id="call-sign" className={inputClass} maxLength="24" value={form.callSign} onChange={(event) => setForm({ ...form, callSign: event.target.value })} required /></FormField><FormField label="Vehicle type" id="vehicle-type"><select id="vehicle-type" className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>ALS</option><option>BLS</option><option>NEONATAL</option></select></FormField><FormField label="Fleet status" id="fleet-status"><select id="fleet-status" className={inputClass} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="AVAILABLE">In service</option><option value="OUT_OF_SERVICE">Out of service</option></select></FormField><FormField label="Latitude" id="fleet-lat"><input id="fleet-lat" type="number" step="0.0001" className={inputClass} value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} required /></FormField><FormField label="Longitude" id="fleet-lng"><input id="fleet-lng" type="number" step="0.0001" className={inputClass} value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} required /></FormField></div><fieldset><legend className="mb-2 text-sm font-medium text-slate-700">Capabilities</legend><div className="grid grid-cols-2 gap-2">{capabilityOptions.map((capability) => <label key={capability} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700"><input type="checkbox" checked={form.capabilities.includes(capability)} onChange={() => toggleCapability(capability)} className="accent-teal-700" />{capability.replaceAll('_', ' ')}</label>)}</div></fieldset>{error && <Alert variant="error">{error}</Alert>}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setModal(false)}>Close</Button><Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Create ambulance'}</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(deactivate)} title="Deactivate ambulance?" description={`${deactivate?.callSign} will no longer be eligible for new demo requests. This can be reversed by editing the vehicle.`} confirmLabel="Deactivate" busy={busy} onClose={() => setDeactivate(null)} onConfirm={confirmDeactivate} />
  </>;
}
