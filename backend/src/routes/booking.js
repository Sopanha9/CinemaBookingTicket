const express = require("express");
const validateBody = require("../middleware/validateBody");
const { authenticate } = require("../middleware/auth");
const bookingController = require("../controller/bookingController");

const router = express.Router();

const validateCreateSeatLocks = validateBody((body) =>
  bookingController.validateLockBody(body),
);

const validateExtendSeatLocks = validateBody((body) =>
  bookingController.validateLockBody(body),
);

const validateReleaseSeatLocks = validateBody((body) =>
  bookingController.validateReleaseLockBody(body),
);

const validateCreateBooking = validateBody((body) =>
  bookingController.validateCreateBookingBody(body),
);

const validateBookingStatus = validateBody((body) =>
  bookingController.validateBookingStatusBody(body),
);

router.post(
  "/bookings/locks",
  authenticate,
  validateCreateSeatLocks,
  bookingController.createSeatLocks,
);

router.patch(
  "/bookings/locks/extend",
  authenticate,
  validateExtendSeatLocks,
  bookingController.extendSeatLocks,
);

router.delete(
  "/bookings/locks",
  authenticate,
  validateReleaseSeatLocks,
  bookingController.releaseSeatLocks,
);

router.post(
  "/bookings",
  authenticate,
  validateCreateBooking,
  bookingController.createBooking,
);

router.get("/bookings", authenticate, bookingController.listMyBookings);
router.get("/bookings/:id", authenticate, bookingController.getMyBooking);

router.patch(
  "/bookings/:id/status",
  authenticate,
  validateBookingStatus,
  bookingController.updateBookingStatus,
);

module.exports = router;
