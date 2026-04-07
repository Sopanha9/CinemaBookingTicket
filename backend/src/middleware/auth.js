const { verifyAccessToken } = require("../lib/jwt");

function authenticate(req, res, next) {
  const authorizationHeader = req.headers.authorization || "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = authorizationHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
};
