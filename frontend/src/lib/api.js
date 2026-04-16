import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  console.error("\u26a0 VITE_API_BASE_URL is not set. API calls will fail.");
}

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cinema_token");

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const details = error?.response?.data?.details;
    const requestUrl = error?.config?.url || "";
    const isAuthLogin = /\/auth\/login\/?$/.test(requestUrl);

    if (status === 401 && !isAuthLogin) {
      localStorage.removeItem("cinema_token");
      sessionStorage.setItem("cinema_auth_notice", "expired");
      window.location.href = "/login";
    }

    const message =
      error?.response?.data?.error || error.message || "Request failed";
    const requestId = error?.response?.data?.requestId;

    const err = new Error(message);
    err.status = status;
    err.details = details;
    err.requestId = requestId;

    return Promise.reject(err);
  },
);

export default api;
