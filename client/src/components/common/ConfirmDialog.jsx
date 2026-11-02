import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button.jsx';

export function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', danger = false, busy = false, onConfirm, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const listener = (event) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [open, busy, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div className="flex items-start justify-between"><div><h2 id="confirm-title" className="text-lg font-semibold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></div><button aria-label="Close dialog" onClick={onClose} disabled={busy} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={19} /></button></div>
      <div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>{confirmLabel}</Button></div>
    </section>
  </div>;
}
