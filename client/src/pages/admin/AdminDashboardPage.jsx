import { useCallback } from 'react';
import { Activity, Ambulance, Building2, ClipboardList, RefreshCw, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { usePolling } from '../../hooks/usePolling.js';
import { PageHeading } from '../../components/dashboards/PageHeading.jsx';
import { StatCard } from '../../components/dashboards/StatCard.jsx';
import { Card, CardTitle } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { CaseCard } from '../../components/dashboards/CaseCard.jsx';

export function AdminDashboardPage() {
  const load = useCallback(async () => (await api.get('/admin/dashboard')).data, []);
  const { data, loading, error, refresh } = usePolling(load, 12000);
  const counts = data?.counts || {};
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return <>
    <PageHeading eyebrow="Administration" title="Operations overview" description="A live summary of synthetic cases and demo resources." action={<Button variant="secondary" onClick={refresh}><RefreshCw size={16} /> Refresh</Button>} />
    {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Cases in demo" value={loading ? '…' : total} caption="All sample statuses" icon={ClipboardList} tone="blue" /><StatCard label="Needs review" value={loading ? '…' : counts.NEEDS_REVIEW || 0} caption="Administrator action needed" icon={TriangleAlert} tone="rose" /><StatCard label="Available ambulances" value={loading ? '…' : data?.fleetAvailable} caption="In service and unassigned" icon={Ambulance} tone="teal" /><StatCard label="Active hospitals" value={loading ? '…' : data?.hospitalCount} caption="Emergency departments enabled" icon={Building2} tone="amber" /></div>
    <div className="mt-7 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <section><CardTitle subtitle="Cases updated most recently.">Recent cases</CardTitle>{loading ? <p className="text-sm text-slate-500">Loading cases…</p> : data?.recent?.length ? <div className="space-y-3">{data.recent.slice(0, 5).map((item) => <CaseCard key={item.id} item={item} detailHref={`/admin/requests/${item.id}`} compact />)}</div> : <EmptyState title="No cases yet" description="Submit a synthetic request from the public page to start the workflow." />}</section>
      <section><Card><CardTitle action={<Link to="/admin/cases" className="text-sm font-semibold text-teal-800">All cases</Link>} subtitle="Requires attention before any trip can proceed.">Needs review</CardTitle>{loading ? <p className="text-sm text-slate-500">Loading…</p> : data?.needsReview?.length ? <div className="space-y-3">{data.needsReview.map((item) => <Link key={item.id} to={`/admin/requests/${item.id}`} className="block rounded-xl border border-rose-100 bg-rose-50/50 p-3 hover:bg-rose-50"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-slate-500">{item.reference}</span><Activity size={15} className="text-rose-700" /></div><p className="mt-1 text-sm font-semibold text-slate-800">{item.locationLabel}</p><p className="mt-1 text-xs text-slate-500">{item.requirements.length ? item.requirements.join(', ') : 'Emergency response'}</p></Link>)}</div> : <EmptyState title="Nothing needs review" description="Cases with no safe automatic match appear here." />}</Card></section>
    </div>
  </>;
}
