import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Activity, Ambulance, Building2, ClipboardList, FileChartColumn, LayoutDashboard, LogOut, Menu, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth, homeForRole } from '../../context/AuthContext.jsx';
import { NotificationBell } from './NotificationBell.jsx';

const navigation = {
  ADMIN: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/cases', label: 'Emergency cases', icon: ClipboardList },
    { to: '/admin/ambulances', label: 'Ambulances', icon: Ambulance },
    { to: '/admin/hospitals', label: 'Hospitals', icon: Building2 },
    { to: '/admin/users', label: 'User accounts', icon: Users },
    { to: '/admin/reports', label: 'Reports', icon: FileChartColumn },
    { to: '/admin/audit', label: 'Audit history', icon: ShieldCheck },
  ],
  OPERATOR: [{ to: '/operator', label: 'My dispatches', icon: Ambulance, end: true }],
  HOSPITAL: [{ to: '/hospital', label: 'Hospital desk', icon: Building2, end: true }],
};

const roleLabel = { ADMIN: 'System administrator', OPERATOR: 'Ambulance operator', HOSPITAL: 'Hospital desk' };

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  const NavContent = ({ onNavigate }) => <>
    <div className="flex h-20 items-center gap-3 px-6">
      <span className="grid size-10 place-items-center rounded-xl bg-teal-700 text-white"><Activity size={21} /></span>
      <div><p className="text-sm font-bold tracking-tight text-slate-950">Responda</p><p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Coordination demo</p></div>
    </div>
    <div className="px-4 pt-5"><p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
      <nav aria-label="Main navigation" className="space-y-1">{(navigation[user?.role] || []).map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon size={18} />{label}</NavLink>)}</nav>
    </div>
    <div className="mt-auto p-4">
      <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong className="block font-semibold">Academic demo only</strong>Never use for real medical emergencies.</div>
      <button onClick={signOut} className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"><LogOut size={17} /> Sign out</button>
    </div>
  </>;

  return <div className="min-h-screen bg-[#f5f8f8]">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex"><NavContent /></aside>
    {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/40" onClick={() => setMobileOpen(false)} /><aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col bg-white shadow-2xl"><div className="absolute right-3 top-4"><button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X size={18} /></button></div><NavContent onNavigate={() => setMobileOpen(false)} /></aside></div>}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 flex h-[4.5rem] items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur sm:px-7">
        <div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="grid size-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"><Menu size={19} /></button><div><p className="text-xs font-medium text-slate-400">{roleLabel[user?.role]}</p><p className="text-sm font-semibold text-slate-900">{user?.name}</p></div></div>
        <div className="flex items-center gap-2"><NotificationBell /><span className="hidden size-9 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-800 sm:grid">{user?.name?.[0]?.toUpperCase()}</span></div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8"><Outlet /></main>
      <footer className="px-4 pb-6 text-center text-xs text-slate-400 lg:pl-8">Responda is an academic demonstration using synthetic sample data.</footer>
    </div>
  </div>;
}
