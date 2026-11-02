const options = [
  ['icu', 'ICU transport'], ['ventilator', 'Ventilator support'], ['oxygen', 'Oxygen'],
  ['cardiac_support', 'Cardiac support'], ['paramedic', 'Paramedic assistance'],
  ['stretcher', 'Stretcher'], ['neonatal_care', 'Neonatal care'],
];

export function CapabilitySelector({ selected, onToggle }) {
  return <fieldset><legend className="text-base font-semibold text-slate-900">2. Care and vehicle requirements</legend><p className="mt-1 text-sm text-slate-500">The matcher treats these as required capabilities, not clinical triage.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{options.map(([value, label]) => <label key={value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3.5 transition ${selected.includes(value) ? 'border-teal-300 bg-teal-50/70' : 'border-slate-200 hover:bg-slate-50'}`}><input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} className="size-4 accent-teal-700" /><span className="text-sm font-medium text-slate-700">{label}</span></label>)}</div></fieldset>;
}
