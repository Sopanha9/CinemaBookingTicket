const express = require("express");
const validateBody = require("../middleware/validateBody");
const { authenticate } = require("../middleware/auth");
const { register, login, me, logout } = require("../controller/authController");

const router = express.Router();

function buildStringField(value) {
  return typeof value === "string" ? value.trim() : "";
}

const validateRegisterBody = validateBody((body) => {
  const errors = [];
  const name = buildStringField(body.name);
  const email = buildStringField(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const phone =
    body.phone === undefined
      ? undefined
      : buildStringField(body.phone) || undefined;

  if (!name) {
    errors.push("name is required and must be a non-empty string");
  }

  if (!email || !email.includes("@")) {
    errors.push("email is required and must be a valid email address");
  }

  if (!password || password.length < 8) {
    errors.push("password is required and must be at least 8 characters long");
  }

  if (body.phone !== undefined && !phone) {
    errors.push("phone must be a non-empty string when provided");
  }

  return {
    errors,
    value: {
      name,
      email,
      password,
      phone,
    },
  };
});

const validateLoginBody = validateBody((body) => {
  const errors = [];
  const email = buildStringField(body.email).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !email.includes("@")) {
    errors.push("email is required and must be a valid email address");
  }

  if (!password) {
    errors.push("password is required");
  }

  return {
    errors,
    value: {
      email,
      password,
    },
  };
});

router.post("/auth/register", validateRegisterBody, register);
router.post("/auth/login", validateLoginBody, login);
router.post("/auth/logout", authenticate, logout);
router.get("/auth/me", authenticate, me);

module.exports = router;
