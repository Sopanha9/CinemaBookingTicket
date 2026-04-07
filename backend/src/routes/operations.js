const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const operationsController = require("../controller/operationsController");

const router = express.Router();

router.post(
  "/admin/operations/cleanup-expired-locks",
  authenticate,
  requireRole("admin"),
  operationsController.cleanupExpiredSeatLocks,
);

module.exports = router;
