import api from "../../lib/api";

// Theaters
export const getTheaters = async (params = {}) => {
  const response = await api.get("/admin/theaters", { params });
  return response.data;
};

export const getTheater = async (id) => {
  const response = await api.get(`/admin/theaters/${id}`);
  return response.data;
};

export const createTheater = async (data) => {
  const response = await api.post("/admin/theaters", data);
  return response.data;
};

export const updateTheater = async (id, data) => {
  const response = await api.put(`/admin/theaters/${id}`, data);
  return response.data;
};

export const deleteTheater = async (id) => {
  const response = await api.delete(`/admin/theaters/${id}`);
  return response.data;
};

// Screens
export const getScreens = async (params = {}) => {
  const response = await api.get("/admin/screens", { params });
  return response.data;
};

export const getScreen = async (id) => {
  const response = await api.get(`/admin/screens/${id}`);
  return response.data;
};

export const createScreen = async (data) => {
  const response = await api.post("/admin/screens", data);
  return response.data;
};

export const updateScreen = async (id, data) => {
  const response = await api.put(`/admin/screens/${id}`, data);
  return response.data;
};

export const deleteScreen = async (id) => {
  const response = await api.delete(`/admin/screens/${id}`);
  return response.data;
};

// Movies
export const getMovies = async (params = {}) => {
  const response = await api.get("/admin/movies", { params });
  return response.data;
};

export const getMovie = async (id) => {
  const response = await api.get(`/admin/movies/${id}`);
  return response.data;
};

export const createMovie = async (data) => {
  const response = await api.post("/admin/movies", data);
  return response.data;
};

export const updateMovie = async (id, data) => {
  const response = await api.put(`/admin/movies/${id}`, data);
  return response.data;
};

export const deleteMovie = async (id) => {
  const response = await api.delete(`/admin/movies/${id}`);
  return response.data;
};

// Genres
export const getGenres = async (params = {}) => {
  const response = await api.get("/admin/genres", { params });
  return response.data;
};

export const getGenre = async (id) => {
  const response = await api.get(`/admin/genres/${id}`);
  return response.data;
};

export const createGenre = async (data) => {
  const response = await api.post("/admin/genres", data);
  return response.data;
};

export const updateGenre = async (id, data) => {
  const response = await api.put(`/admin/genres/${id}`, data);
  return response.data;
};

export const deleteGenre = async (id) => {
  const response = await api.delete(`/admin/genres/${id}`);
  return response.data;
};

// Menu Items
export const getMenuItems = async (params = {}) => {
  const response = await api.get("/admin/menu-items", { params });
  return response.data;
};

export const getMenuItem = async (id) => {
  const response = await api.get(`/admin/menu-items/${id}`);
  return response.data;
};

export const createMenuItem = async (data) => {
  const response = await api.post("/admin/menu-items", data);
  return response.data;
};

export const updateMenuItem = async (id, data) => {
  const response = await api.put(`/admin/menu-items/${id}`, data);
  return response.data;
};

export const deleteMenuItem = async (id) => {
  const response = await api.delete(`/admin/menu-items/${id}`);
  return response.data;
};

// Movie Genre mapping
export const addMovieGenre = async ({ movieId, genreId }) => {
  const response = await api.post("/admin/movies/genres/add", {
    movieId,
    genreId,
  });
  return response.data;
};

export const removeMovieGenre = async (movieId, genreId) => {
  const response = await api.delete(
    `/admin/movies/${movieId}/genres/${genreId}`,
  );
  return response.data;
};

// Pricing Rules
export const getPricingRules = async (params = {}) => {
  const response = await api.get("/admin/pricing-rules", { params });
  return response.data;
};

export const getPricingRule = async (id) => {
  const rules = await getPricingRules();
  return (rules || []).find((rule) => rule.id === Number(id)) || null;
};

export const createPricingRule = async (data) => {
  const response = await api.post("/admin/pricing-rules", data);
  return response.data;
};

export const updatePricingRule = async (id, data) => {
  const response = await api.put(`/admin/pricing-rules/${id}`, data);
  return response.data;
};

export const deletePricingRule = async (id) => {
  const response = await api.delete(`/admin/pricing-rules/${id}`);
  return response.data;
};

// Showtimes
export const getShowtimes = async (params = {}) => {
  const response = await api.get("/admin/showtimes", { params });
  return response.data;
};

export const getShowtime = async (id) => {
  const response = await api.get(`/admin/showtimes/${id}`);
  return response.data;
};

export const createShowtime = async (data) => {
  const response = await api.post("/admin/showtimes", data);
  return response.data;
};

export const updateShowtime = async (id, data) => {
  const response = await api.put(`/admin/showtimes/${id}`, data);
  return response.data;
};
