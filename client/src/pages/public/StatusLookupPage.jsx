import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, KeyRound, MapPin, RotateCw, XCircle } from 'lucide-react';
import { api, errorMessage } from '../../services/api.js';
import { PublicShell } from './RequestFormPage.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Card } from '../../components/common/Card.jsx';
import { FormField, inputClass } from '../../components/common/FormField.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { formatDate, titleCase } from '../../utils/format.js';

export function StatusLookupPage() {
  const { state } = useLocation();
  const [reference, setReference] = useState(state?.reference || '');
  const [lookupToken, setLookupToken] = useState(state?.lookupToken || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function lookup(event) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try { const { data } = await api.post('/requests/status-lookup', { reference: reference.trim(), lookupToken: lookupToken.trim() }); setResult(data.case); }
    catch (requestError) { setError(errorMessage(requestError)); }
    finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true); setError('');
    try { await api.post(`/requests/${encodeURIComponent(reference.trim())}/cancel`, { lookupToken: lookupToken.trim(), reason: 'Caller requested cancellation of this demo case.' }); await lookup({ preventDefault() {} }); }
    catch (requestError) { setError(errorMessage(requestError)); setBusy(false); }
  }

  const canCancel = result && ['OFFERED', 'NEEDS_REVIEW', 'MATCHING'].includes(result.status);
  return <PublicShell><div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
    <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Back to overview</Link>
    <div className="mt-7"><span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-800"><KeyRound size={19} /></span><h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">Check a demo case</h1><p className="mt-2 text-sm leading-6 text-slate-600">Enter the case reference and private lookup token shown after submission.</p></div>
    <form onSubmit={lookup} className="mt-6"><Card className="space-y-4"><FormField label="Case reference" id="case-reference"><input id="case-reference" className={inputClass} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="TRI-..." required /></FormField><FormField label="Private lookup token" id="lookup-token"><input id="lookup-token" className={inputClass} value={lookupToken} onChange={(event) => setLookupToken(event.target.value)} placeholder="Paste the saved token" required /></FormField>{error && <Alert variant="error">{error}</Alert>}<Button type="submit" loading={busy}><RotateCw size={16} /> Look up status</Button></Card></form>
    {result && <Card className="mt-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wider text-slate-400">{result.reference}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">Case status</h2></div><StatusBadge status={result.status} /></div><p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} className="text-teal-700" />{result.locationLabel}</p>{result.ambulance && <p className="mt-3 text-sm text-slate-700">Ambulance: <strong>{result.ambulance.callSign}</strong> · {titleCase(result.ambulance.assignmentState)}</p>}{result.hospital && <p className="mt-2 text-sm text-slate-700">Hospital: <strong>{result.hospital.name}</strong> · {titleCase(result.hospital.proposalState)}</p>}
      <div className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-sm font-semibold text-slate-800">Timeline</h3><ol className="mt-3 space-y-3">{result.timeline.map((event, index) => <li key={`${event.status}-${index}`} className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-teal-600" /><div><p className="text-sm font-medium text-slate-800">{titleCase(event.status)}</p><p className="text-xs text-slate-400">{formatDate(event.createdAt)}</p></div></li>)}</ol></div>
      {canCancel && <Button variant="secondary" className="mt-5" disabled={busy} onClick={cancel}><XCircle size={16} /> Cancel demo case</Button>}
    </Card>}
  </div></PublicShell>;
}
