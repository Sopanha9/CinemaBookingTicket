const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const reportingController = require("../controller/reportingController");

const router = express.Router();

router.get(
  "/admin/reports/revenue",
  authenticate,
  requireRole("admin"),
  reportingController.getRevenueReport,
);

router.get(
  "/admin/reports/bookings",
  authenticate,
  requireRole("admin"),
  reportingController.getBookingVolumeReport,
);

router.get(
  "/admin/reports/occupancy",
  authenticate,
  requireRole("admin"),
  reportingController.getOccupancyReport,
);

router.get(
  "/admin/reports/top-movies",
  authenticate,
  requireRole("admin"),
  reportingController.getTopMoviesReport,
);

module.exports = router;
