import { authApi } from "../api/auth";

export const authService = {
  login: authApi.login,
  googleLogin: authApi.googleLogin,
  register: authApi.register,
  me: authApi.me,
  logout: authApi.logout
};

export default authService;
