import { useCallback, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/auth";
import { AuthContext } from "./AuthContextObject";

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
        } catch {
          localStorage.removeItem(USER_KEY);
        }
      }

      try {
        const currentUser = await authApi.me();
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  const login = useCallback(async (payload) => {
    const data = await authApi.login(payload);
    if (data?.otpRequired) {
      return data;
    }
    persistSession(data);
    return data.user || null;
  }, []);

  const verifyLoginOtp = useCallback(async (payload) => {
    const data = await authApi.verifyLoginOtp(payload);
    persistSession(data);
    return data.user;
  }, []);

  const requestLoginOtp = useCallback(async (payload) => {
    const data = await authApi.requestLoginOtp(payload);
    return data;
  }, []);

  const loginWithGoogle = useCallback(async (token) => {
    const data = await authApi.googleLogin({ token });
    persistSession(data);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    return data;
  }, []);

  const verifyAccountOtp = useCallback(async (payload) => {
    const data = await authApi.verifyAccountOtp(payload);
    persistSession(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network failures during logout cleanup.
    }
    clearSession();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      loginWithGoogle,
      verifyLoginOtp,
      requestLoginOtp,
      register,
      resendOtp: authApi.resendOtp,
      verifyAccountOtp,
      forgotPassword: authApi.forgotPassword,
      verifyForgotPasswordOTP: authApi.verifyForgotPasswordOTP,
      resetPassword: authApi.resetPassword,
      logout,
    }),
    [user, loading, login, loginWithGoogle, verifyLoginOtp, requestLoginOtp, register, verifyAccountOtp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
