import { LoaderCircle } from 'lucide-react';

const variants = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-600',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:ring-teal-600',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500',
  quiet: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-teal-600',
};

export function Button({ children, variant = 'primary', loading = false, className = '', type = 'button', ...props }) {
  return <button type={type} className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
    {loading && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{children}
  </button>;
}
