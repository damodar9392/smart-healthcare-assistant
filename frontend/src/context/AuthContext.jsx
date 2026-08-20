import { createContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { getUser, setUser, setToken, clearAuth } from '../utils/token';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(getUser());
  const [loading, setLoading] = useState(Boolean(getUser()));

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials);
    setToken(data.token);
    setUser(data.user);
    setUserState(data.user);
    return data.user;
  };

  const register = (payload) => authApi.register(payload);

  const logout = () => {
    clearAuth();
    setUserState(null);
  };

  useEffect(() => {
    if (!getUser()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(({ data }) => setUserState(data.user))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;