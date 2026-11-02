import { Link } from 'react-router-dom';
import { ArrowRight, Ambulance, Building2, CheckCircle2, Clock3, MapPin, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '../../components/common/Button.jsx';

const steps = [
  { number: '01', title: 'Share a location', copy: 'Choose a sample point in the Chandigarh Tricity area and tell us what support is needed.', icon: MapPin },
  { number: '02', title: 'Review a match', copy: 'The demo checks vehicle capabilities, nearby facilities and sample bed counts.', icon: Sparkles },
  { number: '03', title: 'Coordinate the trip', copy: 'Operator and hospital users update the case through a shared status timeline.', icon: CheckCircle2 },
];

export function LandingPage() {
  return <div className="min-h-screen bg-white text-slate-900">
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs font-semibold text-amber-900 sm:text-sm"><ShieldAlert size={15} className="mr-2 inline" />Academic demonstration only. Do not use this website for real emergencies.</div>
    <header className="mx-auto flex h-[4.75rem] max-w-7xl items-center justify-between px-5 sm:px-8">
      <Link to="/" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-teal-700 text-white"><Ambulance size={21} /></span><span><span className="block text-base font-bold tracking-tight">Responda</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Coordination demo</span></span></Link>
      <nav className="flex items-center gap-2"><Link to="/login" className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:block">Staff sign in</Link><Link to="/request/emergency"><Button className="min-h-10 px-3 sm:px-4">Open demo <ArrowRight size={16} /></Button></Link></nav>
    </header>
    <main>
      <section className="relative isolate overflow-hidden bg-[#f4f8f7]">
        <div className="absolute -right-24 -top-24 -z-10 size-[30rem] rounded-full bg-teal-100/60 blur-3xl" /><div className="absolute -bottom-44 left-1/3 -z-10 size-[30rem] rounded-full bg-cyan-100/45 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.02fr_0.98fr] lg:py-28">
          <div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-teal-800"><span className="size-1.5 rounded-full bg-teal-600" /> Chandigarh · Mohali · Panchkula</div>
            <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-[3.7rem]">One coordinated view for the moments that matter.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Explore a simple demonstration of how callers, ambulance operators and hospital teams could coordinate an emergency journey from one shared case.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/request/emergency"><Button className="min-h-12 justify-center px-5 text-base"><Ambulance size={19} /> Start a demo request <ArrowRight size={17} /></Button></Link><Link to="/request/requirements"><Button variant="secondary" className="min-h-12 justify-center px-5 text-base">Choose care requirements</Button></Link></div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-slate-500"><span className="inline-flex items-center gap-1.5"><Clock3 size={14} /> Sample data only</span><span className="inline-flex items-center gap-1.5"><Building2 size={14} /> No live hospital connections</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -left-5 top-12 hidden h-28 w-24 rounded-3xl border border-teal-100 bg-white/60 sm:block" />
            <div className="relative rounded-[1.8rem] border border-white bg-white p-4 shadow-[0_24px_80px_-30px_rgba(15,118,110,0.34)] sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">Coordination overview</p><p className="mt-1 text-lg font-semibold text-slate-900">Tricity demo network</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Sample data</span></div>
              <div className="relative mt-5 overflow-hidden rounded-2xl bg-[#eef5f3] p-4 sm:p-6">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(30deg, transparent 48%, #b6d5cf 49%, #b6d5cf 50%, transparent 51%),linear-gradient(120deg, transparent 48%, #c8ddd9 49%, #c8ddd9 50%, transparent 51%)', backgroundSize: '74px 74px' }} />
                <div className="relative grid min-h-64 place-items-center">
                  <svg viewBox="0 0 420 260" className="absolute inset-0 h-full w-full" aria-hidden="true"><path d="M78 177 C128 154, 148 103, 208 113 S300 173, 354 79" fill="none" stroke="#0f766e" strokeWidth="3" strokeDasharray="7 8"/><path d="M80 177 C125 194, 162 212, 223 198" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 7"/></svg>
                  <div className="absolute left-[14%] top-[61%] grid size-11 place-items-center rounded-2xl bg-teal-700 text-white shadow-lg shadow-teal-800/20"><Ambulance size={21} /></div>
                  <div className="absolute left-[47%] top-[35%] grid size-10 place-items-center rounded-full border-4 border-white bg-rose-500 text-white shadow-md"><MapPin size={18} /></div>
                  <div className="absolute right-[12%] top-[19%] grid size-11 place-items-center rounded-2xl bg-white text-teal-700 shadow-lg"><Building2 size={20} /></div>
                  <div className="absolute bottom-3 left-3 rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Illustrative route</p><p className="mt-0.5 text-xs font-semibold text-slate-800">Not live location data</p></div>
                  <div className="absolute right-3 top-3 rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Example only</p><p className="mt-0.5 text-xs font-semibold text-slate-800">No real dispatch</p></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ambulance</p><p className="mt-1 text-xs font-bold text-slate-900 sm:text-sm">Capability match</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hospital</p><p className="mt-1 text-xs font-bold text-slate-900 sm:text-sm">Sample capacity</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Workflow</p><p className="mt-1 text-xs font-bold text-slate-900 sm:text-sm">Status timeline</p></div></div>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">A shared workflow</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">From request to handover, step by step.</h2><p className="mt-3 leading-7 text-slate-600">The demo makes the matching and confirmation steps visible to each participating role.</p></div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">{steps.map(({ number, title, copy, icon: Icon }) => <article key={number} className="rounded-2xl border border-slate-200 bg-white p-6"><div className="flex items-center justify-between"><span className="text-xs font-bold tracking-widest text-slate-300">{number}</span><span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon size={19} /></span></div><h3 className="mt-7 text-lg font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p></article>)}</div>
      </section>
      <section className="border-y border-slate-100 bg-slate-50/70"><div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-5 py-10 sm:flex-row sm:items-center sm:px-8"><div><p className="text-lg font-semibold text-slate-900">Working on the coordination side?</p><p className="mt-1 text-sm text-slate-600">Sign in to the operator, hospital or administrator demo workspace.</p></div><Link to="/login"><Button variant="secondary">Staff sign in <ArrowRight size={16} /></Button></Link></div></section>
    </main>
    <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>© 2026 Responda academic project</span><span>Not for real emergencies · Synthetic sample data only</span></footer>
  </div>;
}
