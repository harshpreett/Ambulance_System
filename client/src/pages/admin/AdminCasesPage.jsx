import { useCallback, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { api } from '../../services/api.js';
import { usePolling } from '../../hooks/usePolling.js';
import { PageHeading } from '../../components/dashboards/PageHeading.jsx';
import { CaseCard } from '../../components/dashboards/CaseCard.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { Button } from '../../components/common/Button.jsx';
import { FormField, inputClass } from '../../components/common/FormField.jsx';

const statuses = ['', 'MATCHING', 'OFFERED', 'ACCEPTED', 'EN_ROUTE_TO_CALLER', 'PATIENT_PICKED_UP', 'EN_ROUTE_TO_HOSPITAL', 'HANDOVER_COMPLETE', 'CLOSED', 'NEEDS_REVIEW', 'CANCELLED'];

export function AdminCasesPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const load = useCallback(async () => (await api.get('/admin/requests', { params: status ? { status } : {} })).data.cases, [status]);
  const { data = [], loading, error, refresh } = usePolling(load, 12000);
  const filtered = data.filter((item) => `${item.reference} ${item.locationLabel} ${item.requirements.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <PageHeading eyebrow="Administration" title="Emergency cases" description="Review the complete synthetic case history, filter by status and open a case to manage its resources." action={<Button variant="secondary" onClick={refresh}><RefreshCw size={16} /> Refresh</Button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_14rem]"><div className="relative"><Search size={17} className="absolute left-3.5 top-3.5 text-slate-400" /><input className={`${inputClass} pl-10`} aria-label="Search cases" placeholder="Search reference, location or requirement" value={search} onChange={(event) => setSearch(event.target.value)} /></div><FormField label="Status filter" id="case-status"><select id="case-status" className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((value) => <option key={value} value={value}>{value ? value.replaceAll('_', ' ') : 'All statuses'}</option>)}</select></FormField></div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {loading ? <p className="text-sm text-slate-500">Loading case records…</p> : filtered.length ? <div className="grid gap-4 xl:grid-cols-2">{filtered.map((item) => <CaseCard key={item.id} item={item} detailHref={`/admin/requests/${item.id}`} />)}</div> : <EmptyState title="No matching cases" description="Try another status or submit a synthetic request from the public page." />}
  </>;
}
