import api from "../../lib/api";

export const getRevenueReport = async ({ from, to } = {}) => {
  const response = await api.get("/admin/reports/revenue", {
    params: {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  });
  return response.data;
};

export const getBookingReport = async ({ from, to, status } = {}) => {
  const response = await api.get("/admin/reports/bookings", {
    params: {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(status && status !== "all" ? { status } : {}),
    },
  });
  return response.data;
};

export const getOccupancyReport = async ({ limit } = {}) => {
  const response = await api.get("/admin/reports/occupancy", {
    params: {
      ...(limit ? { limit } : {}),
    },
  });
  return response.data;
};

export const getTopMoviesReport = async ({ limit } = {}) => {
  const response = await api.get("/admin/reports/top-movies", {
    params: {
      ...(limit ? { limit } : {}),
    },
  });
  return response.data;
};

export const cleanupExpiredLocks = async () => {
  const response = await api.post("/admin/operations/cleanup-expired-locks");
  return response.data;
};
