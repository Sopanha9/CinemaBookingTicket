const express = require("express");
const validateBody = require("../middleware/validateBody");
const { createMovie } = require("../controller/movieController");
const schedulingController = require("../controller/schedulingController");

const router = express.Router();

const validateCreateMovie = validateBody((body) => {
  const errors = [];
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const duration = Number(body.duration);
  const language =
    typeof body.language === "string" ? body.language.trim() : undefined;

  if (!title) {
    errors.push("title is required and must be a non-empty string");
  }

  if (!Number.isInteger(duration) || duration <= 0) {
    errors.push("duration is required and must be a positive integer");
  }

  if (body.language !== undefined && !language) {
    errors.push("language must be a non-empty string when provided");
  }

  return {
    errors,
    value: {
      title,
      duration,
      language,
    },
  };
});

router.post("/movies", validateCreateMovie, createMovie);

router.get("/movies/showtimes", schedulingController.listPublicShowtimes);
router.get(
  "/movies/showtimes/:id/pricing",
  schedulingController.getShowtimePricing,
);
router.get(
  "/movies/showtimes/:id/seats/availability",
  schedulingController.getShowtimeSeatAvailability,
);

module.exports = router;
