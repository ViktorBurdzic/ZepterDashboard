import { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/auth.service';
import storageService from '../services/storage.service';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = storageService.getAccessToken();
    const storedUser = storageService.getUser();

    if (token && authService.isTokenValid(token) && storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const { user } = await authService.login(email, password);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const register = useCallback(async (data) => {
    const result = await authService.register(data);
    return result;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
