import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
    if (error?.response?.status === 401) {
      localStorage.removeItem("cinema_token");
      window.location.href = "/login";
    }

    const message =
      error?.response?.data?.error || error.message || "Request failed";
    const requestId = error?.response?.data?.requestId;

    const err = new Error(message);
    err.requestId = requestId;

    return Promise.reject(err);
  },
);

export default api;
