import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, HeartPulse, Info } from 'lucide-react';
import { api, errorMessage } from '../../services/api.js';
import { Button } from '../../components/common/Button.jsx';
import { Card } from '../../components/common/Card.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { FormField, inputClass } from '../../components/common/FormField.jsx';
import { LocationPicker } from '../../components/maps/LocationPicker.jsx';
import { CapabilitySelector } from '../../components/forms/CapabilitySelector.jsx';

export function RequestFormPage({ requirementMode = false }) {
  const navigate = useNavigate();
  const [location, setLocation] = useState({ latitude: 30.7333, longitude: 76.7794, locationLabel: 'Sector 17, Chandigarh' });
  const [selected, setSelected] = useState([]);
  const [filters, setFilters] = useState({ ownershipFilter: '', specialtyFilter: '', maxDistanceKm: '' });
  const [contact, setContact] = useState({ callerName: '', callerPhone: '', notes: '' });
  const [locationError, setLocationError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggleRequirement(capability) {
    setSelected((items) => items.includes(capability) ? items.filter((item) => item !== capability) : [...items, capability]);
  }

  async function submit(event) {
    event.preventDefault();
    setError(''); setLocationError('');
    if (!location.locationLabel.trim()) { setLocationError('Enter a location label.'); return; }
    if (requirementMode && selected.length === 0) { setError('Choose at least one care or vehicle requirement.'); return; }
    setBusy(true);
    try {
      const idempotencyKey = window.crypto.randomUUID();
      const { data } = await api.post('/requests', {
        requestType: requirementMode ? 'REQUIREMENT_BASED' : 'EMERGENCY',
        latitude: Number(location.latitude), longitude: Number(location.longitude), locationLabel: location.locationLabel.trim(),
        requirements: requirementMode ? selected : [],
        ownershipFilter: filters.ownershipFilter || undefined,
        specialtyFilter: filters.specialtyFilter || undefined,
        maxDistanceKm: filters.maxDistanceKm ? Number(filters.maxDistanceKm) : undefined,
        callerName: contact.callerName || undefined, callerPhone: contact.callerPhone || undefined, notes: contact.notes || undefined,
      }, { headers: { 'Idempotency-Key': idempotencyKey } });
      navigate('/request/confirmation', { state: { case: data.case } });
    } catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  return <PublicShell>
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Back to overview</Link>
      <div className="mt-7"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800"><HeartPulse size={14} /> {requirementMode ? 'Requirement-based demo' : 'Emergency demo request'}</div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">{requirementMode ? 'What support is needed?' : 'Start a demo request'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">This form creates a synthetic case for demonstrating matching and coordination. It does not contact an ambulance or emergency service.</p></div>
      <Alert className="mt-5" variant="info"><strong>For a real emergency, contact your local emergency services directly.</strong> This academic demonstration is not monitored.</Alert>
      <form onSubmit={submit} className="mt-6 space-y-5">
        <Card><h2 className="mb-4 text-base font-semibold text-slate-900">1. Location</h2><LocationPicker value={location} onChange={setLocation} error={locationError} /></Card>
        {requirementMode && <Card><CapabilitySelector selected={selected} onToggle={toggleRequirement} /></Card>}
        <Card><div className="flex items-start gap-3"><span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Info size={16} /></span><div><h2 className="text-base font-semibold text-slate-900">{requirementMode ? '3. Optional preferences' : '2. Optional preferences'}</h2><p className="mt-1 text-sm text-slate-500">These narrow the sample hospital list. Leave blank to consider all demo facilities.</p></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><FormField label="Hospital ownership" id="ownership"><select id="ownership" className={inputClass} value={filters.ownershipFilter} onChange={(event) => setFilters({ ...filters, ownershipFilter: event.target.value })}><option value="">Any ownership</option><option value="GOVERNMENT">Government</option><option value="PRIVATE">Private</option></select></FormField>
            <FormField label="Maximum distance (km)" id="distance"><input id="distance" type="number" min="1" max="100" className={inputClass} placeholder="Any distance" value={filters.maxDistanceKm} onChange={(event) => setFilters({ ...filters, maxDistanceKm: event.target.value })} /></FormField>
            <FormField label="Hospital specialty" id="specialty" className="sm:col-span-2"><select id="specialty" className={inputClass} value={filters.specialtyFilter} onChange={(event) => setFilters({ ...filters, specialtyFilter: event.target.value })}><option value="">No specialty preference</option><option value="cardiac_care">Cardiac care</option><option value="neonatal_care">Neonatal care</option><option value="oxygen">Oxygen support</option></select></FormField>
          </div>
        </Card>
        <Card><h2 className="text-base font-semibold text-slate-900">{requirementMode ? '4. Optional contact details' : '3. Optional contact details'}</h2><p className="mt-1 text-sm text-slate-500">Use fictional details only. Provider views use these only in the demonstration.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><FormField label="Name" id="caller-name"><input id="caller-name" maxLength="100" className={inputClass} placeholder="Demo caller" value={contact.callerName} onChange={(event) => setContact({ ...contact, callerName: event.target.value })} /></FormField><FormField label="Phone" id="caller-phone"><input id="caller-phone" maxLength="24" className={inputClass} placeholder="Optional" value={contact.callerPhone} onChange={(event) => setContact({ ...contact, callerPhone: event.target.value })} /></FormField><FormField label="Note" id="caller-note" className="sm:col-span-2"><textarea id="caller-note" maxLength="500" rows="3" className={`${inputClass} resize-y`} placeholder="Optional demonstration note" value={contact.notes} onChange={(event) => setContact({ ...contact, notes: event.target.value })} /></FormField></div></Card>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-md text-xs leading-5 text-slate-500">Submitting sends this synthetic case to the local demo website only.</p><Button type="submit" loading={busy} className="min-h-12 px-5">Find demo resources <ArrowRight size={17} /></Button></div>
      </form>
    </div>
  </PublicShell>;
}

export function PublicShell({ children }) {
  return <div className="min-h-screen bg-[#f6f9f8]"><header className="border-b border-slate-200 bg-white"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6"><Link to="/" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-teal-700 text-white"><HeartPulse size={18} /></span><span className="text-sm font-bold text-slate-900">Responda <span className="font-medium text-slate-400">/ demo</span></span></Link><span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">Not for real emergencies</span></div></header>{children}<footer className="mx-auto max-w-7xl px-4 pb-7 text-center text-xs text-slate-400">Academic project · Synthetic sample data · No live emergency services</footer></div>;
}
