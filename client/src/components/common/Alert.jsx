import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const styles = {
  error: ['border-rose-200 bg-rose-50 text-rose-900', AlertCircle],
  success: ['border-emerald-200 bg-emerald-50 text-emerald-900', CheckCircle2],
  info: ['border-sky-200 bg-sky-50 text-sky-900', Info],
};

export function Alert({ variant = 'info', children, className = '' }) {
  const [style, Icon] = styles[variant];
  return <div role={variant === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-xl border px-4 py-3 text-sm ${style} ${className}`}>
    <Icon className="mt-0.5 shrink-0" size={17} aria-hidden="true" /><div>{children}</div>
  </div>;
}
