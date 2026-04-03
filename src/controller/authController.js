const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { signAccessToken } = require("../lib/jwt");

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function register(req, res, next) {
  try {
    const { name, email, password, phone } = req.validatedBody;
    const normalizedEmail = email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ error: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        phone,
        role: "customer",
      },
    });

    const token = signAccessToken({
      sub: String(user.id),
      role: user.role,
      email: user.email,
    });

    return res.status(201).json({
      user: sanitizeUser(user),
      accessToken: token,
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.validatedBody;
    const normalizedEmail = email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signAccessToken({
      sub: String(user.id),
      role: user.role,
      email: user.email,
    });

    return res.status(200).json({
      user: sanitizeUser(user),
      accessToken: token,
    });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const userId = Number(req.auth.sub);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user: sanitizeUser(user) });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res) {
  return res.status(200).json({
    message: "Logged out successfully. Discard the access token on the client.",
  });
}

module.exports = {
  register,
  login,
  me,
  logout,
};
