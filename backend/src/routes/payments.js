const express = require("express");
const validateBody = require("../middleware/validateBody");
const { authenticate, requireRole } = require("../middleware/auth");
const paymentController = require("../controller/paymentController");

const router = express.Router();

const validateCreatePayment = validateBody((body) =>
  paymentController.validateCreatePaymentBody(body),
);

const validatePaymentStatusUpdate = validateBody((body) =>
  paymentController.validateUpdatePaymentStatusBody(body),
);

const validateRefundPayment = validateBody((body) =>
  paymentController.validateRefundBody(body),
);

router.post(
  "/payments/webhooks/aggregator",
  paymentController.handleAggregatorWebhook,
);

router.post(
  "/payments",
  authenticate,
  validateCreatePayment,
  paymentController.createPayment,
);

router.get("/payments", authenticate, paymentController.listPayments);
router.get("/payments/:id", authenticate, paymentController.getPayment);

router.patch(
  "/payments/:id/status",
  authenticate,
  requireRole("admin"),
  validatePaymentStatusUpdate,
  paymentController.updatePaymentStatus,
);

router.post(
  "/payments/:id/refund",
  authenticate,
  requireRole("admin"),
  validateRefundPayment,
  paymentController.refundPayment,
);

module.exports = router;
