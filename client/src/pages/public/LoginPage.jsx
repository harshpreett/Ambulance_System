import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth, homeForRole } from '../../context/AuthContext.jsx';
import { errorMessage } from '../../services/api.js';
import { Button } from '../../components/common/Button.jsx';
import { Card } from '../../components/common/Card.jsx';
import { FormField, inputClass } from '../../components/common/FormField.jsx';
import { Alert } from '../../components/common/Alert.jsx';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homeForRole(user.role)} replace />;

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const loggedInUser = await login({ email, password }); navigate(homeForRole(loggedInUser.role), { replace: true }); }
    catch (loginError) { setError(errorMessage(loginError, 'Sign in could not be completed.')); }
    finally { setBusy(false); }
  }

  return <div className="grid min-h-screen bg-[#f5f8f8] lg:grid-cols-[1fr_0.85fr]">
    <div className="relative hidden overflow-hidden bg-[#0d3434] p-12 text-white lg:flex lg:flex-col lg:justify-between"><div className="absolute -right-36 top-1/4 size-[32rem] rounded-full border border-white/10" /><div className="absolute -right-20 top-1/4 size-[21rem] rounded-full border border-white/10" /><Link to="/" className="relative flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-teal-500 text-white"><Activity size={22} /></span><span className="text-lg font-bold">Responda</span></Link><div className="relative max-w-lg"><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">A shared coordination view</p><h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">Clear roles. A connected case. One trip at a time.</h1><p className="mt-5 max-w-md leading-7 text-teal-50/70">Sign in to the demo workspace for ambulance operators, hospital desks and project administrators.</p></div><div className="relative flex items-center gap-2 text-xs text-teal-100/60"><ShieldCheck size={15} /> Sample records only · Not an emergency service</div></div>
    <div className="flex flex-col justify-center px-5 py-10 sm:px-10"><div className="mx-auto w-full max-w-md"><Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Return to overview</Link><span className="grid size-12 place-items-center rounded-2xl bg-teal-100 text-teal-800 lg:hidden"><Activity size={22} /></span><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Staff workspace</p><h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Sign in to Responda</h2><p className="mt-2 text-sm text-slate-500">Use one of the sample accounts documented in the project README.</p>
      <form onSubmit={submit} className="mt-7"><Card className="space-y-4"><FormField label="Email address" id="email"><input id="email" type="email" autoComplete="username" className={inputClass} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" required /></FormField><FormField label="Password" id="password"><input id="password" type="password" autoComplete="current-password" className={inputClass} value={password} onChange={(event) => setPassword(event.target.value)} required /></FormField>{error && <Alert variant="error">{error}</Alert>}<Button type="submit" loading={busy} className="w-full"><LockKeyhole size={16} /> Sign in</Button></Card></form>
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-5 text-amber-900"><strong>Academic demo only.</strong> These sample accounts are for a local presentation and must not be reused on a public service.</div></div></div>
  </div>;
}
