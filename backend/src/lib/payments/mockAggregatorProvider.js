const crypto = require("crypto");

function randomId(prefix) {
  const token = crypto.randomBytes(8).toString("hex");
  return `${prefix}_${token}`;
}

function createPaymentIntent({ amount, currency, bookingId, method }) {
  const providerPaymentId = randomId("pay");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const khqrPayload = `000201010212520441115303116540${Number(amount).toFixed(2)}5802KH5914CINEMA BOOKING6008PHNOM PENH62140710BK${bookingId}6304ABCD`;

  return {
    providerPaymentId,
    method,
    amount,
    currency,
    checkoutType: "qr",
    qrPayload: khqrPayload,
    qrImageUrl: `https://mock-aggregator.local/qr/${providerPaymentId}`,
    expiresAt,
  };
}

function refundPayment({ paymentId, amount, reason }) {
  return {
    providerRefundId: randomId("rfnd"),
    paymentId,
    amount,
    reason: reason || null,
    status: "accepted",
    createdAt: new Date(),
  };
}

function verifyWebhookSignature({ body, signature, secret }) {
  if (!secret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(body))
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function parseWebhookPayload(payload) {
  const providerPaymentId =
    typeof payload.providerPaymentId === "string"
      ? payload.providerPaymentId.trim()
      : "";

  const rawStatus =
    typeof payload.status === "string"
      ? payload.status.trim().toLowerCase()
      : "";

  const statusMap = {
    success: "paid",
    paid: "paid",
    failed: "failed",
    refunded: "refunded",
  };

  const status = statusMap[rawStatus];

  return {
    providerPaymentId,
    status,
    externalReference:
      typeof payload.externalReference === "string"
        ? payload.externalReference.trim()
        : undefined,
    rawPayload: payload,
  };
}

module.exports = {
  providerName: "mock-aggregator",
  createPaymentIntent,
  refundPayment,
  verifyWebhookSignature,
  parseWebhookPayload,
};
