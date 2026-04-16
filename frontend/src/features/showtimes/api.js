import api from "../../lib/api";

export const getShowtimes = async (params = {}) => {
  const response = await api.get("/movies/showtimes", {
    params,
  });

  return response.data;
};

export const getShowtimeSeats = async (id) => {
  const response = await api.get(`/movies/showtimes/${id}/seats/availability`);
  return response.data;
};

export const getShowtimePricing = async (id) => {
  const response = await api.get(`/movies/showtimes/${id}/pricing`);
  return response.data;
};
