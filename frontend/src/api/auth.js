import api from "./client";

export const authApi = {
  register: async (payload) => (await api.post("/auth/register", payload)).data.data,
  login: async (payload) => (await api.post("/auth/login", payload)).data.data,
  verifyLoginOtp: async (payload) => (await api.post("/auth/login/verify-otp", payload)).data.data,
  verifyAccountOtp: async (payload) => (await api.post("/auth/verify-account-otp", payload)).data.data,
  resendOtp: async (payload) => (await api.post("/auth/otp/resend", payload)).data.data,
  emailHealth: async () => (await api.get("/auth/email-health")).data.data,
  emailTest: async () => (await api.post("/auth/email-test")).data.data,
  me: async () => (await api.get("/auth/me")).data.data,
  logout: async () => (await api.post("/auth/logout")).data.data
};
