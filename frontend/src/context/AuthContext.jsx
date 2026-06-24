import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('salon_token');
    const storedUser = localStorage.getItem('salon_user');

    if (!token) { setLoading(false); return; }

    try {
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
      const { data } = await authAPI.getMe();
      const userData = data.data;
      setUser(userData);
      setIsAuthenticated(true);
      localStorage.setItem('salon_user', JSON.stringify(userData));
    } catch {
      localStorage.removeItem('salon_token');
      localStorage.removeItem('salon_refresh_token');
      localStorage.removeItem('salon_user');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = (userData, token, refreshToken) => {
    localStorage.setItem('salon_token', token);
    localStorage.setItem('salon_refresh_token', refreshToken);
    localStorage.setItem('salon_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('salon_token');
    localStorage.removeItem('salon_refresh_token');
    localStorage.removeItem('salon_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isCustomer = user?.role === 'customer';

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, isAdmin, isCustomer, login, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
