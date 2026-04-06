const express = require("express");
const authRoutes = require("./auth");
const healthRoutes = require("./health");
const movieRoutes = require("./movies");
const adminRoutes = require("./admin");
const bookingRoutes = require("./booking");
const paymentRoutes = require("./payments");

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(movieRoutes);
router.use(adminRoutes);
router.use(bookingRoutes);
router.use(paymentRoutes);

module.exports = router;
