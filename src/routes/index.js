const express = require("express");
const authRoutes = require("./auth");
const healthRoutes = require("./health");
const movieRoutes = require("./movies");

const router = express.Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(movieRoutes);

module.exports = router;
