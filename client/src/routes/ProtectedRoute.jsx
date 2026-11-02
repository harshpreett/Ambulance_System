import { Navigate, Outlet } from 'react-router-dom';
import { LoadingState } from '../components/common/LoadingState.jsx';
import { useAuth, homeForRole } from '../context/AuthContext.jsx';

export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return <Outlet />;
}
