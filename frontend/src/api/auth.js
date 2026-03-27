import api from "./client";

export const authApi = {
  register: async (payload) => (await api.post("/auth/register", payload)).data.data,
  login: async (payload) => (await api.post("/auth/login", payload)).data.data,
  me: async () => (await api.get("/auth/me")).data.data,
  logout: async () => (await api.post("/auth/logout")).data.data
};
