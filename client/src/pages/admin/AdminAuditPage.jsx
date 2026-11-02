import { useCallback } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api.js';
import { usePolling } from '../../hooks/usePolling.js';
import { PageHeading } from '../../components/dashboards/PageHeading.jsx';
import { Card } from '../../components/common/Card.jsx';
import { Button } from '../../components/common/Button.jsx';
import { Alert } from '../../components/common/Alert.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { formatDate, titleCase } from '../../utils/format.js';

export function AdminAuditPage() {
  const load = useCallback(async () => (await api.get('/admin/audit')).data.entries, []);
  const { data = [], loading, error, refresh } = usePolling(load, 20000);
  return <>
    <PageHeading eyebrow="Administration" title="Audit history" description="Administrator and provider capacity changes recorded by the demo application." action={<Button variant="secondary" onClick={refresh}><RefreshCw size={16} /> Refresh</Button>} />
    {error && <Alert variant="error" className="mb-4">{error}</Alert>}
    <Card className="overflow-hidden p-0"><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><ShieldCheck size={17} /></span><div><h2 className="text-sm font-semibold text-slate-900">Recorded actions</h2><p className="text-xs text-slate-500">Latest 200 records</p></div></div>{loading ? <p className="p-5 text-sm text-slate-500">Loading audit records…</p> : data.length === 0 ? <div className="p-5"><EmptyState title="No audit entries yet" description="Resource and account changes will be recorded here." /></div> : <div className="divide-y divide-slate-100">{data.map((entry) => <div key={entry.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_12rem]"><div><p className="text-sm font-semibold text-slate-800">{titleCase(entry.action)} <span className="font-normal text-slate-500">· {entry.entityType} {entry.entityId}</span></p><p className="mt-1 text-xs text-slate-500">{entry.actor.name} · {entry.actor.email}{entry.reason ? ` · ${entry.reason}` : ''}</p></div><time className="text-xs text-slate-400 sm:text-right">{formatDate(entry.createdAt)}</time></div>)}</div>}</Card>
  </>;
}
