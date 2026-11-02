export function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.025] ${className}`}>{children}</section>;
}

export function CardTitle({ children, action, subtitle }) {
  return <div className="mb-5 flex items-start justify-between gap-4">
    <div><h2 className="text-base font-semibold text-slate-900">{children}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>
    {action}
  </div>;
}
