import { useCallback } from 'react';
import { Activity, ClipboardCheck, FileChartColumn, RefreshCw, TriangleAlert } from 'lucide-react';
import { api } from '../../services/api.js';
import { usePolling } from '../../hooks/usePolling.js';
import { PageHeading } from '../../components/dashboards/PageHeading.jsx';
import { StatCard } from '../../components/dashboards/StatCard.jsx';
import { Card, CardTitle } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { formatDate, titleCase } from '../../utils/format.js';

export function AdminReportsPage() {
  const load = useCallback(async () => (await api.get('/admin/reports/summary')).data, []);
  const { data, loading, error, refresh } = usePolling(load, 20000);
  const rows = Object.entries(data?.byStatus || {}).sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...rows.map(([, count]) => count));
  return <>
    <PageHeading eyebrow="Administration" title="Reports and statistics" description="Summary counts from the demonstration database. Figures are based only on synthetic cases." action={<Button variant="secondary" onClick={refresh}><RefreshCw size={16} /> Refresh</Button>} />
    {error && <Alert variant="error" className="mb-4">{error}</Alert>}
    <div className="grid gap-4 sm:grid-cols-3"><StatCard label="Total cases" value={loading ? '…' : data?.total} caption="In the demo database" icon={FileChartColumn} tone="blue" /><StatCard label="Closed cases" value={loading ? '…' : data?.completed} caption="Handover and close completed" icon={ClipboardCheck} tone="teal" /><StatCard label="Needs review" value={loading ? '…' : data?.needsReview} caption="No automatic match or escalation" icon={TriangleAlert} tone="rose" /></div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]"><Card><CardTitle subtitle="Number of requests in each current state.">Case status distribution</CardTitle>{loading ? <p className="text-sm text-slate-500">Loading report…</p> : rows.length ? <div className="space-y-4">{rows.map(([status, count]) => <div key={status}><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium text-slate-700">{titleCase(status)}</span><span className="font-semibold text-slate-900">{count}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${(count / max) * 100}%` }} /></div></div>)}</div> : <EmptyState title="No report data yet" />}</Card>
      <Card><CardTitle subtitle="The most recent recorded case transitions.">Recent activity</CardTitle>{data?.recentEvents?.length ? <div className="divide-y divide-slate-100">{data.recentEvents.map((event) => <div key={event.id} className="flex items-start justify-between gap-3 py-3 first:pt-0"><div><p className="text-sm font-semibold text-slate-800">{titleCase(event.newStatus)} <span className="font-normal text-slate-500">· {event.request.publicReference}</span></p><p className="mt-1 text-xs text-slate-400">{event.actor?.name || 'System'}{event.note ? ` · ${event.note}` : ''}</p></div><time className="shrink-0 text-xs text-slate-400">{formatDate(event.createdAt)}</time></div>)}</div> : <EmptyState title="No activity yet" description="Case updates will appear here." />}</Card></div>
    <p className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Activity size={14} /> Reports do not represent real operational performance.</p>
  </>;
}
