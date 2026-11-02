import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { sampleLocations } from '../../utils/sampleLocations.js';
import { FormField, inputClass } from '../common/FormField.jsx';

export function LocationPicker({ value, onChange, error }) {
  const [manual, setManual] = useState(false);
  const matched = sampleLocations.find((location) => location.latitude === Number(value.latitude) && location.longitude === Number(value.longitude));
  const key = manual ? 'custom' : (matched?.id || 'custom');
  function choose(id) {
    const location = sampleLocations.find((item) => item.id === id);
    if (location) onChange({ latitude: location.latitude, longitude: location.longitude, locationLabel: location.label });
  }
  return <div className="space-y-4">
    <FormField label="Choose a sample location" id="location-select" hint="This demo uses selected locations; it does not read device GPS." error={error}>
      <div className="relative"><MapPin size={17} className="pointer-events-none absolute left-3.5 top-3.5 text-teal-700" /><select id="location-select" className={`${inputClass} pl-10`} value={key} onChange={(event) => { setManual(event.target.value === 'custom'); choose(event.target.value); }}>
        {sampleLocations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
        <option value="custom">Manual coordinates</option>
      </select></div>
    </FormField>
    {key === 'custom' && <div className="grid gap-3 sm:grid-cols-2">
      <FormField label="Latitude" id="latitude"><input id="latitude" type="number" min="-90" max="90" step="0.0001" className={inputClass} value={value.latitude} onChange={(event) => onChange({ ...value, latitude: event.target.value })} required /></FormField>
      <FormField label="Longitude" id="longitude"><input id="longitude" type="number" min="-180" max="180" step="0.0001" className={inputClass} value={value.longitude} onChange={(event) => onChange({ ...value, longitude: event.target.value })} required /></FormField>
      <FormField label="Location label" id="location-label" className="sm:col-span-2"><input id="location-label" className={inputClass} maxLength="140" value={value.locationLabel} onChange={(event) => onChange({ ...value, locationLabel: event.target.value })} required /></FormField>
    </div>}
    <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-xs leading-5 text-teal-900">Demo service area: Chandigarh, Mohali and Panchkula. Coordinates outside the demonstration area cannot be matched.</div>
  </div>;
}
