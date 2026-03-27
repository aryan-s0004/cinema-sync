import api from "./axiosInstance";

export const loginUser = async (payload) => {
  const { data } = await api.post("/auth/login", payload);
  return data.data;
};

export const registerUser = async (payload) => {
  const { data } = await api.post("/auth/register", payload);
  return data.data;
};

export const getMe = async () => {
  const { data } = await api.get("/auth/me");
  return data.data;
};
