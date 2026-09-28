import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('infratrack_token'));
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage and verify with backend
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('infratrack_token');
      const storedUser = localStorage.getItem('infratrack_user');

      if (storedToken) {
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // parse error ignored
          }
        }

        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.data?.user) {
            setUser(res.data.data.user);
            localStorage.setItem('infratrack_user', JSON.stringify(res.data.data.user));
          }
        } catch (err) {
          console.warn('[Auth] Session check failed, clearing token');
          localStorage.removeItem('infratrack_token');
          localStorage.removeItem('infratrack_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success) {
        const { user: authUser, token: authToken } = res.data.data;
        setUser(authUser);
        setToken(authToken);
        localStorage.setItem('infratrack_token', authToken);
        localStorage.setItem('infratrack_user', JSON.stringify(authUser));
        return { success: true, user: authUser };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (err) {
      const message = err.response?.data?.message || 'Unable to authenticate. Please check network/credentials.';
      return { success: false, message };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('infratrack_token');
    localStorage.removeItem('infratrack_user');
    setUser(null);
    setToken(null);
    window.location.href = '/login';
  }, []);

  const hasRole = useCallback(
    (...roles) => {
      if (!user) return false;
      if (user.role === 'SUPER_ADMIN') return true;
      return roles.includes(user.role);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
