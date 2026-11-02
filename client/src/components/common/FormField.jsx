export function FormField({ label, id, error, hint, children, className = '' }) {
  return <div className={`space-y-1.5 ${className}`}>
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
    {children}
    {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    {error && <p className="text-xs font-medium text-rose-700">{error}</p>}
  </div>;
}

export const inputClass = 'min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10';
