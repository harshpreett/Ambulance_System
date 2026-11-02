import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearCsrfToken, setCsrfToken } from '../services/api.js';

const AuthContext = createContext(null);

export function homeForRole(role) {
  if (role === 'OPERATOR') return '/operator';
  if (role === 'HOSPITAL') return '/hospital';
  if (role === 'ADMIN') return '/admin';
  return '/';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    await api.get('/auth/csrf');
    const { data } = await api.post('/auth/login', credentials);
    setCsrfToken(data.csrfToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally { setUser(null); clearCsrfToken(); }
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout, refreshUser }), [user, loading, login, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
