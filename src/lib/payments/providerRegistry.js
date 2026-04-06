const mockAggregatorProvider = require("./mockAggregatorProvider");

const PROVIDERS = {
  mock: mockAggregatorProvider,
  "mock-aggregator": mockAggregatorProvider,
};

function getActivePaymentProvider() {
  const key = (process.env.PAYMENT_PROVIDER || "mock").trim().toLowerCase();
  const provider = PROVIDERS[key];

  if (!provider) {
    throw new Error(`Unsupported PAYMENT_PROVIDER: ${key}`);
  }

  return provider;
}

module.exports = {
  getActivePaymentProvider,
};
