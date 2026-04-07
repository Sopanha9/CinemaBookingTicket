const jwt = require("jsonwebtoken");

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables.");
  }

  return secret;
}

function signAccessToken(payload) {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
