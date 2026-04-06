const prisma = require("../lib/prisma");
const {
  getActivePaymentProvider,
} = require("../lib/payments/providerRegistry");

const PAYMENT_METHODS = [
  "credit_card",
  "debit_card",
  "upi",
  "net_banking",
  "cash_at_counter",
];

const MANUAL_STATUS_UPDATES = ["paid", "failed"];
const PAYMENT_STATUS_TRANSITIONS = {
  pending: new Set(["paid", "failed"]),
  paid: new Set(["refunded"]),
  failed: new Set([]),
  refunded: new Set([]),
};

function parsePositiveInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }

  return num;
}

function parseOptionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const text = String(value).trim();
  return text || undefined;
}

function canTransitionPaymentStatus(fromStatus, toStatus) {
  return PAYMENT_STATUS_TRANSITIONS[fromStatus]?.has(toStatus) || false;
}

async function applyPaymentStatusChange(
  tx,
  { paymentId, nextStatus, externalReference, reason, source },
) {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId },
    include: {
      booking: true,
    },
  });

  if (!payment) {
    return { error: { status: 404, message: "Payment not found" } };
  }

  if (!canTransitionPaymentStatus(payment.status, nextStatus)) {
    return {
      error: {
        status: 400,
        message: `Invalid payment status transition from ${payment.status} to ${nextStatus}`,
      },
    };
  }

  if (nextStatus === "refunded" && payment.booking.status !== "cancelled") {
    return {
      error: {
        status: 400,
        message: "Booking must be cancelled before a refund can be recorded",
      },
    };
  }

  const updatedPayment = await tx.payment.update({
    where: { id: paymentId },
    data: {
      status: nextStatus,
      ...(externalReference ? { transactionId: externalReference } : {}),
    },
  });

  if (nextStatus === "paid" && payment.booking.status === "pending") {
    await tx.booking.update({
      where: { id: payment.bookingId },
      data: {
        status: "confirmed",
      },
    });
  }

  const updatedBooking = await tx.booking.findUnique({
    where: { id: payment.bookingId },
  });

  return {
    payment: updatedPayment,
    booking: updatedBooking,
    audit: {
      source,
      previousStatus: payment.status,
      nextStatus,
      reason: reason || null,
      changedAt: new Date(),
    },
  };
}

async function createPayment(req, res, next) {
  try {
    const userId = Number(req.auth.sub);
    const role = req.auth.role;
    const { bookingId, paymentMethod } = req.validatedBody;

    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: { payments: true },
      });

      if (!booking) {
        return { error: { status: 404, message: "Booking not found" } };
      }

      const isOwner = booking.userId === userId;
      const isAdmin = role === "admin";
      if (!isOwner && !isAdmin) {
        return { error: { status: 403, message: "Forbidden" } };
      }

      if (booking.status === "cancelled") {
        return {
          error: {
            status: 400,
            message: "Cannot create payment for a cancelled booking",
          },
        };
      }

      const hasPaidPayment = booking.payments.some(
        (payment) => payment.status === "paid",
      );
      if (hasPaidPayment) {
        return {
          error: {
            status: 409,
            message: "Booking already has a successful payment",
          },
        };
      }

      const provider = getActivePaymentProvider();
      const intent = provider.createPaymentIntent({
        amount: Number(booking.totalAmount),
        currency: process.env.PAYMENT_CURRENCY || "USD",
        bookingId,
        method: paymentMethod,
      });

      const payment = await tx.payment.create({
        data: {
          bookingId,
          amount: booking.totalAmount,
          paymentMethod,
          transactionId: intent.providerPaymentId,
          status: "pending",
        },
      });

      return {
        payment,
        provider: {
          name: provider.providerName,
          checkoutType: intent.checkoutType,
          qrPayload: intent.qrPayload,
          qrImageUrl: intent.qrImageUrl,
          expiresAt: intent.expiresAt,
        },
      };
    });

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ error: result.error.message });
    }

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

async function listPayments(req, res, next) {
  try {
    const userId = Number(req.auth.sub);
    const role = req.auth.role;
    const bookingId = req.query.bookingId
      ? parsePositiveInt(req.query.bookingId)
      : undefined;

    const where = {
      ...(bookingId ? { bookingId } : {}),
      ...(role === "admin" ? {} : { booking: { userId } }),
    };

    const payments = await prisma.payment.findMany({
      where,
      include: {
        booking: true,
      },
      orderBy: {
        paymentTime: "desc",
      },
    });

    return res.status(200).json(payments);
  } catch (error) {
    return next(error);
  }
}

async function getPayment(req, res, next) {
  try {
    const userId = Number(req.auth.sub);
    const role = req.auth.role;
    const paymentId = parsePositiveInt(req.params.id);

    if (!paymentId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const isOwner = payment.booking.userId === userId;
    const isAdmin = role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json(payment);
  } catch (error) {
    return next(error);
  }
}

async function updatePaymentStatus(req, res, next) {
  try {
    const paymentId = parsePositiveInt(req.params.id);

    if (!paymentId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const { status, externalReference, reason } = req.validatedBody;

    const result = await prisma.$transaction((tx) =>
      applyPaymentStatusChange(tx, {
        paymentId,
        nextStatus: status,
        externalReference,
        reason,
        source: "manual",
      }),
    );

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ error: result.error.message });
    }

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function refundPayment(req, res, next) {
  try {
    const paymentId = parsePositiveInt(req.params.id);

    if (!paymentId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const { reason } = req.validatedBody;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: true,
        },
      });

      if (!payment) {
        return { error: { status: 404, message: "Payment not found" } };
      }

      if (payment.status !== "paid") {
        return {
          error: {
            status: 400,
            message: "Only paid payments can be refunded",
          },
        };
      }

      if (payment.booking.status !== "cancelled") {
        return {
          error: {
            status: 400,
            message: "Booking must be cancelled before refund",
          },
        };
      }

      const provider = getActivePaymentProvider();
      const providerRefund = provider.refundPayment({
        paymentId: payment.transactionId || String(payment.id),
        amount: Number(payment.amount),
        reason,
      });

      const statusResult = await applyPaymentStatusChange(tx, {
        paymentId,
        nextStatus: "refunded",
        externalReference: providerRefund.providerRefundId,
        reason,
        source: "refund",
      });

      return {
        ...statusResult,
        providerRefund,
      };
    });

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ error: result.error.message });
    }

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

async function handleAggregatorWebhook(req, res, next) {
  try {
    const provider = getActivePaymentProvider();
    const signature = req.headers["x-payment-signature"];
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;

    const isValid = provider.verifyWebhookSignature({
      body: req.body,
      signature,
      secret,
    });

    if (!isValid) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    const event = provider.parseWebhookPayload(req.body);

    if (!event.providerPaymentId || !event.status) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        transactionId: event.providerPaymentId,
      },
      select: { id: true },
    });

    if (!payment) {
      return res
        .status(404)
        .json({ error: "Payment not found for provider reference" });
    }

    const result = await prisma.$transaction((tx) =>
      applyPaymentStatusChange(tx, {
        paymentId: payment.id,
        nextStatus: event.status,
        externalReference: event.externalReference,
        reason: "webhook event",
        source: "webhook",
      }),
    );

    if (result.error) {
      return res
        .status(result.error.status)
        .json({ error: result.error.message });
    }

    return res.status(200).json({
      acknowledged: true,
      paymentId: result.payment.id,
      status: result.payment.status,
      bookingStatus: result.booking?.status,
    });
  } catch (error) {
    return next(error);
  }
}

function validateCreatePaymentBody(body) {
  const errors = [];
  const bookingId = parsePositiveInt(body.bookingId);
  const paymentMethod =
    body.paymentMethod !== undefined
      ? String(body.paymentMethod).trim().toLowerCase()
      : "upi";

  if (!bookingId) {
    errors.push("bookingId is required and must be a positive integer");
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    errors.push(`paymentMethod must be one of: ${PAYMENT_METHODS.join(", ")}`);
  }

  return {
    errors,
    value: {
      bookingId,
      paymentMethod,
    },
  };
}

function validateUpdatePaymentStatusBody(body) {
  const errors = [];
  const status =
    body.status !== undefined ? String(body.status).trim().toLowerCase() : "";
  const externalReference = parseOptionalString(body.externalReference);
  const reason = parseOptionalString(body.reason);

  if (!MANUAL_STATUS_UPDATES.includes(status)) {
    errors.push(
      `status is required and must be one of: ${MANUAL_STATUS_UPDATES.join(", ")}`,
    );
  }

  return {
    errors,
    value: {
      status,
      externalReference,
      reason,
    },
  };
}

function validateRefundBody(body) {
  const errors = [];
  const reason = parseOptionalString(body.reason);

  if (body.reason !== undefined && !reason) {
    errors.push("reason must be a non-empty string when provided");
  }

  return {
    errors,
    value: {
      reason,
    },
  };
}

module.exports = {
  createPayment,
  listPayments,
  getPayment,
  updatePaymentStatus,
  refundPayment,
  handleAggregatorWebhook,
  validateCreatePaymentBody,
  validateUpdatePaymentStatusBody,
  validateRefundBody,
};
