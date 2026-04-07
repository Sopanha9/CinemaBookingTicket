import { create } from "zustand";

const TOKEN_STORAGE_KEY = "cinema_token";

const readStoredToken = () => {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStoredToken = (token) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage write failures and keep in-memory auth state.
  }
};

const removeStoredToken = () => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage removal failures and keep clearing in-memory auth state.
  }
};

const initialToken = readStoredToken();

export const useAuthStore = create((set) => ({
  user: null,
  token: initialToken,
  isAuthenticated: false,
  isLoading: Boolean(initialToken),

  setAuth: (user, token) => {
    writeStoredToken(token);

    set({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  clearAuth: () => {
    removeStoredToken();

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (isLoading) => {
    set({ isLoading: Boolean(isLoading) });
  },
}));

export { TOKEN_STORAGE_KEY };
