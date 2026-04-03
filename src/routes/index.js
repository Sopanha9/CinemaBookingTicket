const express = require("express");
const healthRoutes = require("./health");
const movieRoutes = require("./movies");

const router = express.Router();

router.use(healthRoutes);
router.use(movieRoutes);

module.exports = router;
