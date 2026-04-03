const express = require("express");
const authRoutes = require("./auth");
const healthRoutes = require("./health");
const movieRoutes = require("./movies");
const adminRoutes = require("./admin");

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(movieRoutes);
router.use(adminRoutes);

module.exports = router;
