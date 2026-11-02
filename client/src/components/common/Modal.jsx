import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({ open, title, children, onClose, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label={title} className={`my-8 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} rounded-2xl bg-white p-5 shadow-2xl sm:p-6`}><div className="mb-5 flex items-start justify-between gap-3"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><button onClick={onClose} aria-label="Close" className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>{children}</section></div>;
}
