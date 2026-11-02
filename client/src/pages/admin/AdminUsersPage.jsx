import { useCallback, useMemo, useState } from 'react';
import { KeyRound, Plus, RefreshCw, UserRound, UserRoundCheck, UserRoundX } from 'lucide-react';
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

const emptyForm = { name: '', email: '', password: '', role: 'OPERATOR', ambulanceId: '', hospitalId: '' };

export function AdminUsersPage() {
  const load = useCallback(async () => (await api.get('/admin/users')).data, []);
  const { data, loading, error: loadError, refresh } = usePolling(load, 15000);
  const [form, setForm] = useState(emptyForm);
  const [modal, setModal] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [password, setPassword] = useState('');
  const [activeTarget, setActiveTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const linkedAmbulanceIds = useMemo(() => new Set((data?.users || []).filter((user) => user.ambulanceId).map((user) => user.ambulanceId)), [data?.users]);
  const linkedHospitalIds = useMemo(() => new Set((data?.users || []).filter((user) => user.hospitalId).map((user) => user.hospitalId)), [data?.users]);

  async function createUser(event) {
    event.preventDefault(); setBusy(true); setError('');
    const body = { ...form, ambulanceId: form.role === 'OPERATOR' ? Number(form.ambulanceId) : undefined, hospitalId: form.role === 'HOSPITAL' ? Number(form.hospitalId) : undefined };
    try { await api.post('/admin/users', body); setModal(false); setForm(emptyForm); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function toggleActive() {
    setBusy(true); setError('');
    try { await api.patch(`/admin/users/${activeTarget.id}`, { active: !activeTarget.active }); setActiveTarget(null); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); setActiveTarget(null); }
    finally { setBusy(false); }
  }

  async function resetPassword(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api.patch(`/admin/users/${passwordTarget.id}`, { password }); setPasswordTarget(null); setPassword(''); refresh(); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  function changeRole(role) { setForm((current) => ({ ...current, role, ambulanceId: '', hospitalId: '' })); }
  const availableAmbulances = (data?.ambulances || []).filter((row) => !linkedAmbulanceIds.has(row.id));
  const availableHospitals = (data?.hospitals || []).filter((row) => !linkedHospitalIds.has(row.id));

  return <>
    <PageHeading eyebrow="Administration" title="User accounts" description="Create demo access, link providers to one resource, deactivate accounts and reset sample passwords." action={<div className="flex gap-2"><Button variant="secondary" onClick={refresh}><RefreshCw size={16} /> Refresh</Button><Button onClick={() => { setError(''); setForm(emptyForm); setModal(true); }}><Plus size={16} /> Add user</Button></div>} />
    {(error || loadError) && <Alert variant="error" className="mb-4">{error || loadError}</Alert>}
    {loading ? <p className="text-sm text-slate-500">Loading users…</p> : !data?.users?.length ? <EmptyState title="No user accounts" description="Create administrator, operator and hospital demo access." /> : <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="hidden grid-cols-[1.4fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-400 md:grid"><span>User</span><span>Role</span><span>Linked resource</span><span>Actions</span></div>{data.users.map((user) => <div key={user.id} className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-0 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-center md:gap-4 md:px-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><UserRound size={17} /></span><div><p className="text-sm font-semibold text-slate-800">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></div></div><div><span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">{user.role.replaceAll('_', ' ')}</span></div><div className="text-sm text-slate-600">{user.ambulance?.callSign || user.hospital?.name || 'No linked resource'}</div><div className="flex flex-wrap gap-2"><Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => { setPasswordTarget(user); setPassword(''); setError(''); }}><KeyRound size={14} /> Reset password</Button><Button variant="quiet" className="min-h-9 px-3 text-xs" disabled={user.id === data.currentUserId} onClick={() => setActiveTarget(user)}>{user.active ? <><UserRoundX size={14} /> Deactivate</> : <><UserRoundCheck size={14} /> Activate</>}</Button></div></div>)}</div>}
    <Modal open={modal} title="Create demo user" onClose={() => !busy && setModal(false)}><form onSubmit={createUser} className="space-y-4"><FormField label="Full name" id="user-name"><input id="user-name" className={inputClass} maxLength="100" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></FormField><FormField label="Email" id="user-email"><input id="user-email" type="email" className={inputClass} maxLength="150" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></FormField><FormField label="Temporary password" id="user-password" hint="At least 10 characters. Share only in the demo environment."><input id="user-password" type="password" minLength="10" className={inputClass} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></FormField><FormField label="Role" id="user-role"><select id="user-role" className={inputClass} value={form.role} onChange={(event) => changeRole(event.target.value)}><option value="OPERATOR">Ambulance operator</option><option value="HOSPITAL">Hospital staff</option><option value="ADMIN">Administrator</option></select></FormField>{form.role === 'OPERATOR' && <FormField label="Ambulance" id="user-ambulance"><select id="user-ambulance" className={inputClass} value={form.ambulanceId} onChange={(event) => setForm({ ...form, ambulanceId: event.target.value })} required><option value="">Choose unlinked ambulance</option>{availableAmbulances.map((item) => <option key={item.id} value={item.id}>{item.callSign}</option>)}</select></FormField>}{form.role === 'HOSPITAL' && <FormField label="Hospital" id="user-hospital"><select id="user-hospital" className={inputClass} value={form.hospitalId} onChange={(event) => setForm({ ...form, hospitalId: event.target.value })} required><option value="">Choose unlinked hospital</option>{availableHospitals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></FormField>}{error && <Alert variant="error">{error}</Alert>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setModal(false)}>Close</Button><Button type="submit" loading={busy}>Create account</Button></div></form></Modal>
    <Modal open={Boolean(passwordTarget)} title={`Reset password for ${passwordTarget?.name || ''}`} onClose={() => !busy && setPasswordTarget(null)}><form onSubmit={resetPassword} className="space-y-4"><FormField label="New temporary password" id="reset-password"><input id="reset-password" type="password" minLength="10" className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} required /></FormField><p className="text-xs text-slate-500">This will sign the account out on other sessions.</p>{error && <Alert variant="error">{error}</Alert>}<div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setPasswordTarget(null)}>Close</Button><Button type="submit" loading={busy}>Save password</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(activeTarget)} title={`${activeTarget?.active ? 'Deactivate' : 'Activate'} account?`} description={`${activeTarget?.name} will ${activeTarget?.active ? 'lose' : 'regain'} access to the demo workspace. Existing sessions are cleared.`} confirmLabel={activeTarget?.active ? 'Deactivate' : 'Activate'} busy={busy} onClose={() => setActiveTarget(null)} onConfirm={toggleActive} />
  </>;
}
