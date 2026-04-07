const express = require("express");
const validateBody = require("../middleware/validateBody");
const { authenticate, requireRole } = require("../middleware/auth");
const catalogController = require("../controller/catalogController");
const schedulingController = require("../controller/schedulingController");

const router = express.Router();

// ==========================================
// VALIDATION HELPERS
// ==========================================

function buildStringField(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildNumberField(value) {
  const num = Number(value);
  return !isNaN(num) && num > 0 ? num : null;
}

// ==========================================
// THEATER VALIDATORS & ROUTES
// ==========================================

const validateCreateTheater = validateBody((body) => {
  const errors = [];
  const name = buildStringField(body.name);
  const location = buildStringField(body.location);

  if (!name) {
    errors.push("name is required and must be a non-empty string");
  }

  if (!location) {
    errors.push("location is required and must be a non-empty string");
  }

  return {
    errors,
    value: { name, location },
  };
});

const validateUpdateTheater = validateBody((body) => {
  const errors = [];
  const name =
    body.name !== undefined ? buildStringField(body.name) : undefined;
  const location =
    body.location !== undefined ? buildStringField(body.location) : undefined;
  const isActive =
    body.isActive !== undefined ? Boolean(body.isActive) : undefined;

  if (name === "") {
    errors.push("name must be a non-empty string when provided");
  }

  if (location === "") {
    errors.push("location must be a non-empty string when provided");
  }

  return {
    errors,
    value: { name, location, isActive },
  };
});

router.post(
  "/admin/theaters",
  authenticate,
  requireRole("admin"),
  validateCreateTheater,
  catalogController.createTheater,
);

router.get(
  "/admin/theaters",
  authenticate,
  requireRole("admin"),
  catalogController.listTheaters,
);

router.get(
  "/admin/theaters/:id",
  authenticate,
  requireRole("admin"),
  catalogController.getTheater,
);

router.put(
  "/admin/theaters/:id",
  authenticate,
  requireRole("admin"),
  validateUpdateTheater,
  catalogController.updateTheater,
);

router.delete(
  "/admin/theaters/:id",
  authenticate,
  requireRole("admin"),
  catalogController.deleteTheater,
);

// ==========================================
// SCREEN VALIDATORS & ROUTES
// ==========================================

const validateCreateScreen = validateBody((body) => {
  const errors = [];
  const theaterId = buildNumberField(body.theaterId);
  const name = buildStringField(body.name);
  const screenType = body.screenType
    ? buildStringField(body.screenType)
    : undefined;
  const totalRows = buildNumberField(body.totalRows);
  const totalColumns = buildNumberField(body.totalColumns);

  if (!theaterId) {
    errors.push("theaterId is required and must be a positive number");
  }

  if (!name) {
    errors.push("name is required and must be a non-empty string");
  }

  const validScreenTypes = ["regular", "imax", "3d", "4dx"];
  if (screenType && !validScreenTypes.includes(screenType)) {
    errors.push(`screenType must be one of: ${validScreenTypes.join(", ")}`);
  }

  if (!totalRows || totalRows > 50) {
    errors.push("totalRows is required and must be a positive number <= 50");
  }

  if (!totalColumns || totalColumns > 50) {
    errors.push("totalColumns is required and must be a positive number <= 50");
  }

  return {
    errors,
    value: { theaterId, name, screenType, totalRows, totalColumns },
  };
});

const validateUpdateScreen = validateBody((body) => {
  const errors = [];
  const name =
    body.name !== undefined ? buildStringField(body.name) : undefined;
  const screenType =
    body.screenType !== undefined
      ? buildStringField(body.screenType)
      : undefined;
  const isActive =
    body.isActive !== undefined ? Boolean(body.isActive) : undefined;

  if (name === "") {
    errors.push("name must be a non-empty string when provided");
  }

  const validScreenTypes = ["regular", "imax", "3d", "4dx"];
  if (screenType && !validScreenTypes.includes(screenType)) {
    errors.push(`screenType must be one of: ${validScreenTypes.join(", ")}`);
  }

  return {
    errors,
    value: { name, screenType, isActive },
  };
});

router.post(
  "/admin/screens",
  authenticate,
  requireRole("admin"),
  validateCreateScreen,
  catalogController.createScreen,
);

router.get(
  "/admin/screens",
  authenticate,
  requireRole("admin"),
  catalogController.listScreens,
);

router.get(
  "/admin/screens/:id",
  authenticate,
  requireRole("admin"),
  catalogController.getScreen,
);

router.put(
  "/admin/screens/:id",
  authenticate,
  requireRole("admin"),
  validateUpdateScreen,
  catalogController.updateScreen,
);

router.delete(
  "/admin/screens/:id",
  authenticate,
  requireRole("admin"),
  catalogController.deleteScreen,
);

// ==========================================
// MOVIE VALIDATORS & ROUTES
// ==========================================

const validateCreateMovie = validateBody((body) => {
  const errors = [];
  const title = buildStringField(body.title);
  const duration = buildNumberField(body.duration);
  const description =
    body.description !== undefined
      ? buildStringField(body.description)
      : undefined;
  const releaseDate = body.releaseDate
    ? String(body.releaseDate).trim()
    : undefined;
  const posterUrl =
    body.posterUrl !== undefined ? buildStringField(body.posterUrl) : undefined;
  const language =
    body.language !== undefined ? buildStringField(body.language) : undefined;
  const ageRating = body.ageRating
    ? buildStringField(body.ageRating)
    : undefined;
  const status = body.status ? buildStringField(body.status) : undefined;

  if (!title) {
    errors.push("title is required and must be a non-empty string");
  }

  if (!duration || duration > 600) {
    errors.push("duration is required and must be a positive number <= 600");
  }

  if (releaseDate && isNaN(Date.parse(releaseDate))) {
    errors.push("releaseDate must be a valid date");
  }

  const validAgeRatings = ["G", "PG", "PG-13", "R", "NC-17"];
  if (ageRating && !validAgeRatings.includes(ageRating)) {
    errors.push(`ageRating must be one of: ${validAgeRatings.join(", ")}`);
  }

  const validStatuses = ["upcoming", "now_showing", "ended"];
  if (status && !validStatuses.includes(status)) {
    errors.push(`status must be one of: ${validStatuses.join(", ")}`);
  }

  return {
    errors,
    value: {
      title,
      duration,
      description: description || undefined,
      releaseDate: releaseDate || undefined,
      posterUrl: posterUrl || undefined,
      language: language || undefined,
      ageRating,
      status,
    },
  };
});

const validateUpdateMovie = validateBody((body) => {
  const errors = [];
  const title =
    body.title !== undefined ? buildStringField(body.title) : undefined;
  const duration =
    body.duration !== undefined ? buildNumberField(body.duration) : undefined;
  const description =
    body.description !== undefined
      ? buildStringField(body.description)
      : undefined;
  const releaseDate =
    body.releaseDate !== undefined
      ? String(body.releaseDate).trim()
      : undefined;
  const posterUrl =
    body.posterUrl !== undefined ? buildStringField(body.posterUrl) : undefined;
  const language =
    body.language !== undefined ? buildStringField(body.language) : undefined;
  const ageRating =
    body.ageRating !== undefined ? buildStringField(body.ageRating) : undefined;
  const status =
    body.status !== undefined ? buildStringField(body.status) : undefined;

  if (title === "") {
    errors.push("title must be a non-empty string when provided");
  }

  if (duration !== undefined && (duration <= 0 || duration > 600)) {
    errors.push("duration must be a positive number <= 600 when provided");
  }

  if (releaseDate && isNaN(Date.parse(releaseDate))) {
    errors.push("releaseDate must be a valid date");
  }

  const validAgeRatings = ["G", "PG", "PG-13", "R", "NC-17"];
  if (ageRating && !validAgeRatings.includes(ageRating)) {
    errors.push(`ageRating must be one of: ${validAgeRatings.join(", ")}`);
  }

  const validStatuses = ["upcoming", "now_showing", "ended"];
  if (status && !validStatuses.includes(status)) {
    errors.push(`status must be one of: ${validStatuses.join(", ")}`);
  }

  return {
    errors,
    value: {
      title,
      duration,
      description,
      releaseDate,
      posterUrl,
      language,
      ageRating,
      status,
    },
  };
});

router.post(
  "/admin/movies",
  authenticate,
  requireRole("admin"),
  validateCreateMovie,
  catalogController.createMovie,
);

router.get(
  "/admin/movies",
  authenticate,
  requireRole("admin"),
  catalogController.listMovies,
);

router.get(
  "/admin/movies/:id",
  authenticate,
  requireRole("admin"),
  catalogController.getMovie,
);

router.put(
  "/admin/movies/:id",
  authenticate,
  requireRole("admin"),
  validateUpdateMovie,
  catalogController.updateMovie,
);

router.delete(
  "/admin/movies/:id",
  authenticate,
  requireRole("admin"),
  catalogController.deleteMovie,
);

// ==========================================
// GENRE VALIDATORS & ROUTES
// ==========================================

const validateCreateGenre = validateBody((body) => {
  const errors = [];
  const name = buildStringField(body.name);

  if (!name) {
    errors.push("name is required and must be a non-empty string");
  }

  if (name && name.length > 50) {
    errors.push("name must not exceed 50 characters");
  }

  return {
    errors,
    value: { name },
  };
});

const validateUpdateGenre = validateBody((body) => {
  const errors = [];
  const name = buildStringField(body.name);

  if (!name) {
    errors.push("name is required and must be a non-empty string");
  }

  if (name && name.length > 50) {
    errors.push("name must not exceed 50 characters");
  }

  return {
    errors,
    value: { name },
  };
});

router.post(
  "/admin/genres",
  authenticate,
  requireRole("admin"),
  validateCreateGenre,
  catalogController.createGenre,
);

router.get(
  "/admin/genres",
  authenticate,
  requireRole("admin"),
  catalogController.listGenres,
);

router.get(
  "/admin/genres/:id",
  authenticate,
  requireRole("admin"),
  catalogController.getGenre,
);

router.put(
  "/admin/genres/:id",
  authenticate,
  requireRole("admin"),
  validateUpdateGenre,
  catalogController.updateGenre,
);

router.delete(
  "/admin/genres/:id",
  authenticate,
  requireRole("admin"),
  catalogController.deleteGenre,
);

// ==========================================
// MOVIE GENRE ROUTES
// ==========================================

const validateMovieGenre = validateBody((body) => {
  const errors = [];
  const movieId = buildNumberField(body.movieId);
  const genreId = buildNumberField(body.genreId);

  if (!movieId) {
    errors.push("movieId is required and must be a positive number");
  }

  if (!genreId) {
    errors.push("genreId is required and must be a positive number");
  }

  return {
    errors,
    value: { movieId, genreId },
  };
});

router.post(
  "/admin/movies/genres/add",
  authenticate,
  requireRole("admin"),
  validateMovieGenre,
  catalogController.addGenreToMovie,
);

router.delete(
  "/admin/movies/:movieId/genres/:genreId",
  authenticate,
  requireRole("admin"),
  catalogController.removeGenreFromMovie,
);

// ==========================================
// MENU ITEM VALIDATORS & ROUTES
// ==========================================

const validateCreateMenuItem = validateBody((body) => {
  const errors = [];
  const name = buildStringField(body.name);
  const description =
    body.description !== undefined
      ? buildStringField(body.description)
      : undefined;
  const price = body.price ? parseFloat(body.price) : null;
  const category =
    body.category !== undefined ? buildStringField(body.category) : undefined;

  if (!name) {
    errors.push("name is required and must be a non-empty string");
  }

  if (name && name.length > 100) {
    errors.push("name must not exceed 100 characters");
  }

  if (!price || price <= 0) {
    errors.push("price is required and must be a positive number");
  }

  if (price && price > 99999.99) {
    errors.push("price must not exceed 99999.99");
  }

  return {
    errors,
    value: {
      name,
      description: description || undefined,
      price,
      category: category || undefined,
    },
  };
});

const validateUpdateMenuItem = validateBody((body) => {
  const errors = [];
  const name =
    body.name !== undefined ? buildStringField(body.name) : undefined;
  const description =
    body.description !== undefined
      ? buildStringField(body.description)
      : undefined;
  const price = body.price !== undefined ? parseFloat(body.price) : undefined;
  const category =
    body.category !== undefined ? buildStringField(body.category) : undefined;
  const isAvailable =
    body.isAvailable !== undefined ? Boolean(body.isAvailable) : undefined;

  if (name === "") {
    errors.push("name must be a non-empty string when provided");
  }

  if (name && name.length > 100) {
    errors.push("name must not exceed 100 characters");
  }

  if (price !== undefined && (price <= 0 || price > 99999.99)) {
    errors.push("price must be a positive number <= 99999.99 when provided");
  }

  return {
    errors,
    value: {
      name,
      description,
      price,
      category,
      isAvailable,
    },
  };
});

router.post(
  "/admin/menu-items",
  authenticate,
  requireRole("admin"),
  validateCreateMenuItem,
  catalogController.createMenuItem,
);

router.get(
  "/admin/menu-items",
  authenticate,
  requireRole("admin"),
  catalogController.listMenuItems,
);

router.get(
  "/admin/menu-items/:id",
  authenticate,
  requireRole("admin"),
  catalogController.getMenuItem,
);

router.put(
  "/admin/menu-items/:id",
  authenticate,
  requireRole("admin"),
  validateUpdateMenuItem,
  catalogController.updateMenuItem,
);

router.delete(
  "/admin/menu-items/:id",
  authenticate,
  requireRole("admin"),
  catalogController.deleteMenuItem,
);

// ==========================================
// PRICING RULE VALIDATORS & ROUTES
// ==========================================

const validateCreatePricingRule = validateBody((body) =>
  schedulingController.validatePricingRuleBody(body),
);

const validateUpdatePricingRule = validateBody((body) =>
  schedulingController.validatePricingRuleBody(body, { partial: true }),
);

router.post(
  "/admin/pricing-rules",
  authenticate,
  requireRole("admin"),
  validateCreatePricingRule,
  schedulingController.createPricingRule,
);

router.get(
  "/admin/pricing-rules",
  authenticate,
  requireRole("admin"),
  schedulingController.listPricingRules,
);

router.put(
  "/admin/pricing-rules/:id",
  authenticate,
  requireRole("admin"),
  validateUpdatePricingRule,
  schedulingController.updatePricingRule,
);

router.delete(
  "/admin/pricing-rules/:id",
  authenticate,
  requireRole("admin"),
  schedulingController.deletePricingRule,
);

// ==========================================
// SHOWTIME VALIDATORS & ROUTES
// ==========================================

const validateCreateShowtime = validateBody((body) =>
  schedulingController.validateCreateShowtimeBody(body),
);

const validateUpdateShowtime = validateBody((body) =>
  schedulingController.validateUpdateShowtimeBody(body),
);

router.post(
  "/admin/showtimes",
  authenticate,
  requireRole("admin"),
  validateCreateShowtime,
  schedulingController.createShowtime,
);

router.get(
  "/admin/showtimes",
  authenticate,
  requireRole("admin"),
  schedulingController.listAdminShowtimes,
);

router.get(
  "/admin/showtimes/:id",
  authenticate,
  requireRole("admin"),
  schedulingController.getAdminShowtime,
);

router.put(
  "/admin/showtimes/:id",
  authenticate,
  requireRole("admin"),
  validateUpdateShowtime,
  schedulingController.updateShowtime,
);

module.exports = router;
