const listeners = new Set();

const readUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

let state = {
  user: readUser(),
  isAuthenticated: Boolean(localStorage.getItem("accessToken"))
};

const notify = () => listeners.forEach((listener) => listener(state));

const authStore = {
  getState: () => state,
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setSession: ({ user, accessToken, refreshToken }) => {
    if (accessToken) localStorage.setItem("accessToken", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
    if (user) localStorage.setItem("user", JSON.stringify(user));

    state = { user: user || null, isAuthenticated: Boolean(accessToken) };
    notify();
  },
  clearSession: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");

    state = { user: null, isAuthenticated: false };
    notify();
  }
};

export default authStore;
