import { createContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth";

export const AuthContext = createContext(null);

const USER_KEY = "user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const persistSession = (payload) => {
    const safeUser = payload?.user || null;
    if (payload?.accessToken) {
      localStorage.setItem("accessToken", payload.accessToken);
    }
    if (payload?.refreshToken) {
      localStorage.setItem("refreshToken", payload.refreshToken);
    }
    if (safeUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
    }
    setUser(safeUser);
  };

  const clearSession = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem(USER_KEY);

      if (!token) {
        setLoading(false);
        return;
      }

      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (_err) {
          localStorage.removeItem(USER_KEY);
        }
      }

      try {
        const currentUser = await authApi.me();
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      } catch (_err) {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = async (payload) => {
    const data = await authApi.login(payload);
    if (data?.otpRequired) {
      return data;
    }
    persistSession(data);
    return data.user || null;
  };

  const verifyLoginOtp = async (payload) => {
    const data = await authApi.verifyLoginOtp(payload);
    persistSession(data);
    return data.user;
  };

  const loginWithGoogle = async (token) => {
    const data = await authApi.googleLogin({ token });
    persistSession(data);
    return data.user;
  };

  const register = async (payload) => {
    const data = await authApi.register(payload);
    persistSession(data);
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (_err) {
      // Ignore network failures during logout cleanup.
    }
    clearSession();
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      loginWithGoogle,
      verifyLoginOtp,
      register,
      resendOtp: authApi.resendOtp,
      verifyAccountOtp: authApi.verifyAccountOtp,
      logout
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
