import { useCallback, useState } from 'react';
import { Building2, Pencil, Plus, Power, RefreshCw } from 'lucide-react';
import { api, errorMessage } from '../../services/api.js';
import { usePolling } from '../../hooks/usePolling.js';
import { PageHeading } from '../../components/dashboards/PageHeading.jsx';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { FormField, inputClass } from '../../components/common/FormField.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { ConfirmDialog } from '../../components/common/ConfirmDialog.jsx';

const specialties = ['cardiac_care', 'neonatal_care', 'oxygen', 'emergency'];
const initial = { name: '', ownership: 'GOVERNMENT', latitude: '30.7333', longitude: '76.7794', emergencyEnabled: true, active: true, demoPhone: '', specialties: ['emergency'], beds: { EMERGENCY: '8', ICU: '3', VENTILATOR: '2' } };
const bedLabels = { EMERGENCY: 'Emergency', ICU: 'ICU', VENTILATOR: 'Ventilator' };

export function AdminHospitalsPage() {
  const load = useCallback(async () => (await api.get('/admin/hospitals')).data.hospitals, []);
  const { data = [], loading, error: loadError, refresh } = usePolling(load, 15000);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deactivate, setDeactivate] = useState(null);

  function openCreate() { setEditing(null); setForm(initial); setError(''); setModal(true); }
  function openEdit(item) { setEditing(item); setForm({ name: item.name, ownership: item.ownership, latitude: String(item.latitude), longitude: String(item.longitude), emergencyEnabled: item.emergencyEnabled, active: item.active, demoPhone: item.demoPhone || '', specialties: item.specialties.map((row) => row.specialty), beds: Object.fromEntries(['EMERGENCY', 'ICU', 'VENTILATOR'].map((type) => [type, String(item.beds.find((bed) => bed.bedType === type)?.totalCount ?? 0)])) }); setError(''); setModal(true); }
  function toggleSpecialty(value) { setForm((current) => ({ ...current, specialties: current.specialties.includes(value) ? current.specialties.filter((item) => item !== value) : [...current.specialties, value] })); }

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = { name: form.name, ownership: form.ownership, latitude: Number(form.latitude), longitude: Number(form.longitude), emergencyEnabled: form.emergencyEnabled, active: form.active, demoPhone: form.demoPhone || null, specialties: form.specialties, beds: Object.entries(form.beds).map(([bedType, totalCount]) => ({ bedType, totalCount: Number(totalCount) })) };
    try { if (editing) await api.put(`/admin/hospitals/${editing.id}`, body); else await api.post('/admin/hospitals', body); setModal(false); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function deactivateHospital() {
    setBusy(true); setError('');
    try { await api.delete(`/admin/hospitals/${deactivate.id}`); setDeactivate(null); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); setDeactivate(null); }
    finally { setBusy(false); }
  }

  return <>
    <PageHeading eyebrow="Administration" title="Hospitals" description="Manage sample facilities, specialties and capacity used during hospital matching." action={<div className="flex gap-2"><Button variant="secondary" onClick={refresh}><RefreshCw size={16} /> Refresh</Button><Button onClick={openCreate}><Plus size={16} /> Add hospital</Button></div>} />
    {(error || loadError) && <Alert variant="error" className="mb-4">{error || loadError}</Alert>}
    {loading ? <p className="text-sm text-slate-500">Loading facilities…</p> : data.length === 0 ? <EmptyState title="No hospitals yet" description="Add sample facilities before creating matchable cases." /> : <div className="grid gap-4 xl:grid-cols-2">{data.map((item) => <Card key={item.id}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Building2 size={19} /></span><div><h2 className="font-semibold text-slate-900">{item.name}</h2><p className="text-sm text-slate-500">{item.ownership === 'GOVERNMENT' ? 'Government' : 'Private'} · {item.staff?.name || 'No staff account'}</p></div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.active && item.emergencyEnabled ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{item.active && item.emergencyEnabled ? 'Active' : 'Unavailable'}</span></div><div className="mt-4 flex flex-wrap gap-1.5">{item.specialties.map((row) => <span key={row.specialty} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{row.specialty.replaceAll('_', ' ')}</span>)}</div><div className="mt-4 grid grid-cols-3 gap-2">{item.beds.map((bed) => <div key={bed.id} className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{bedLabels[bed.bedType]}</p><p className="mt-1 text-lg font-semibold text-slate-900">{bed.totalCount - bed.heldCount}<span className="ml-1 text-xs font-normal text-slate-400">open</span></p></div>)}</div><p className="mt-3 text-xs text-slate-400">{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)} · Sample data</p><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" disabled={item.proposals?.some((proposal) => proposal.isCurrent)} onClick={() => openEdit(item)}><Pencil size={15} /> Edit</Button><Button variant="quiet" disabled={!item.active || item.proposals?.some((proposal) => proposal.isCurrent)} onClick={() => setDeactivate(item)}><Power size={15} /> Deactivate</Button></div></Card>)}</div>}
    <Modal open={modal} title={editing ? 'Edit hospital' : 'Add sample hospital'} onClose={() => !busy && setModal(false)} wide><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><FormField label="Facility name" id="hospital-name"><input id="hospital-name" className={inputClass} maxLength="140" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="Ownership" id="hospital-ownership"><select id="hospital-ownership" className={inputClass} value={form.ownership} onChange={(event) => setForm({ ...form, ownership: event.target.value })}><option value="GOVERNMENT">Government</option><option value="PRIVATE">Private</option></select></FormField><FormField label="Latitude" id="hospital-lat"><input id="hospital-lat" type="number" step="0.0001" className={inputClass} value={form.latitude} onChange={(event) => setForm({ ...form, latitude: event.target.value })} required /></FormField><FormField label="Longitude" id="hospital-lng"><input id="hospital-lng" type="number" step="0.0001" className={inputClass} value={form.longitude} onChange={(event) => setForm({ ...form, longitude: event.target.value })} required /></FormField><FormField label="Demo phone" id="hospital-phone"><input id="hospital-phone" className={inputClass} maxLength="24" value={form.demoPhone} onChange={(event) => setForm({ ...form, demoPhone: event.target.value })} /></FormField><FormField label="Emergency department" id="hospital-er"><select id="hospital-er" className={inputClass} value={String(form.emergencyEnabled)} onChange={(event) => setForm({ ...form, emergencyEnabled: event.target.value === 'true' })}><option value="true">Enabled</option><option value="false">Disabled</option></select></FormField></div><fieldset><legend className="mb-2 text-sm font-medium text-slate-700">Specialties</legend><div className="flex flex-wrap gap-2">{specialties.map((value) => <label key={value} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700"><input type="checkbox" checked={form.specialties.includes(value)} onChange={() => toggleSpecialty(value)} className="accent-teal-700" />{value.replaceAll('_', ' ')}</label>)}</div></fieldset><div className="grid gap-3 sm:grid-cols-3">{Object.entries(form.beds).map(([type, value]) => <FormField key={type} label={`${bedLabels[type]} beds`} id={`capacity-${type}`}><input id={`capacity-${type}`} type="number" min="0" max="10000" className={inputClass} value={value} onChange={(event) => setForm({ ...form, beds: { ...form.beds, [type]: event.target.value } })} /></FormField>)}</div>{error && <Alert variant="error">{error}</Alert>}<div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setModal(false)}>Close</Button><Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Create hospital'}</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(deactivate)} title="Deactivate this facility?" description={`${deactivate?.name} will not be considered for new matches. Existing proposals must be resolved first.`} confirmLabel="Deactivate" busy={busy} onClose={() => setDeactivate(null)} onConfirm={deactivateHospital} />
  </>;
}
