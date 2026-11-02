import { useCallback, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { api } from '../../services/api.js';
import { formatDate } from '../../utils/format.js';
import { usePolling } from '../../hooks/usePolling.js';
import { Button } from '../common/Button.jsx';
import { EmptyState } from '../common/EmptyState.jsx';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => (await api.get('/notifications')).data.notifications, []);
  const { data, refresh } = usePolling(load, 15000);
  const notifications = data ?? [];
  const unread = notifications.filter((item) => !item.readAt).length;

  async function markRead(id) {
    await api.post(`/notifications/${id}/read`);
    refresh();
  }

  return <div className="relative">
    <button aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => setOpen((value) => !value)} className="relative grid size-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
      <Bell size={19} />{unread > 0 && <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? '9+' : unread}</span>}
    </button>
    {open && <div className="absolute right-0 top-12 z-40 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
      <div className="flex items-center justify-between px-2 py-1"><h3 className="text-sm font-semibold text-slate-900">Notifications</h3><span className="text-xs text-slate-500">{unread} unread</span></div>
      <div className="mt-2 max-h-80 space-y-1 overflow-y-auto">
        {notifications.length === 0 ? <EmptyState title="You're all caught up" description="New case updates will appear here." /> : notifications.map((item) => <div key={item.id} className={`rounded-xl p-3 ${item.readAt ? 'bg-white' : 'bg-teal-50/70'}`}>
          <div className="flex items-start justify-between gap-2"><p className="text-sm leading-5 text-slate-700">{item.message}</p>{!item.readAt && <button aria-label="Mark notification read" onClick={() => markRead(item.id)} className="rounded-md p-1 text-teal-700 hover:bg-teal-100"><Check size={15} /></button>}</div>
          <p className="mt-1 text-xs text-slate-400">{formatDate(item.createdAt)}</p>
        </div>)}
      </div>
      {unread > 0 && <Button variant="quiet" className="mt-2 w-full text-xs" onClick={async () => { await Promise.all(notifications.filter((item) => !item.readAt).map((item) => api.post(`/notifications/${item.id}/read`))); refresh(); }}><CheckCheck size={15} /> Mark all read</Button>}
    </div>}
  </div>;
}
