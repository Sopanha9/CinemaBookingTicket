const prisma = require("../lib/prisma");

const SCREEN_TYPE_MAP = {
  regular: "regular",
  imax: "imax",
  "3d": "threeD",
  threed: "threeD",
  threeD: "threeD",
  "4dx": "fourDx",
  fourdx: "fourDx",
  fourDx: "fourDx",
};

const DAY_TYPE_MAP = {
  weekday: "weekday",
  weekend: "weekend",
  holiday: "holiday",
};

const SEAT_TYPES = ["normal", "vip", "premium", "wheelchair"];

function parsePositiveInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }

  return num;
}

function parseOptionalDecimal(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }

  return Number(num.toFixed(2));
}

function parseDate(value) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeScreenType(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const mapped = SCREEN_TYPE_MAP[value.trim()];
  return mapped;
}

function normalizeDayType(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  return DAY_TYPE_MAP[value.trim().toLowerCase()];
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function resolveDayType(startTime) {
  const holidayConfig = process.env.HOLIDAY_DATES || "";
  const holidays = new Set(
    holidayConfig
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const key = toDateKey(startTime);
  if (holidays.has(key)) {
    return "holiday";
  }

  const day = startTime.getDay();
  if (day === 0 || day === 6) {
    return "weekend";
  }

  return "weekday";
}

async function ensureNoShowtimeOverlap({
  screenId,
  startTime,
  endTime,
  excludeId,
}) {
  const overlap = await prisma.showtime.findFirst({
    where: {
      screenId,
      status: { not: "cancelled" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
    },
  });

  if (overlap) {
    return overlap;
  }

  return null;
}

function validateShowtimeWindow({ movieDuration, startTime, endTime }) {
  if (endTime <= startTime) {
    return "endTime must be later than startTime";
  }

  const runtimeMinutes = Math.ceil(
    (endTime.getTime() - startTime.getTime()) / 60000,
  );

  if (runtimeMinutes < movieDuration) {
    return `showtime window must be at least movie duration (${movieDuration} minutes)`;
  }

  return null;
}

async function resolvePricingMap({ screenType, startTime }) {
  const dayType = resolveDayType(startTime);

  const pricingRules = await prisma.pricingRule.findMany({
    where: {
      screenType,
      dayType,
    },
  });

  const priceBySeatType = new Map();
  for (const rule of pricingRules) {
    priceBySeatType.set(rule.seatType, Number(rule.basePrice));
  }

  return { dayType, priceBySeatType };
}

async function createPricingRule(req, res, next) {
  try {
    const { screenType, seatType, dayType, basePrice } = req.validatedBody;

    const pricingRule = await prisma.pricingRule.create({
      data: {
        screenType,
        seatType,
        dayType,
        basePrice,
      },
    });

    return res.status(201).json(pricingRule);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error:
          "A pricing rule already exists for this screenType + seatType + dayType",
      });
    }

    return next(error);
  }
}

async function listPricingRules(req, res, next) {
  try {
    const where = {
      ...(req.query.screenType
        ? { screenType: normalizeScreenType(req.query.screenType) }
        : {}),
      ...(req.query.seatType
        ? { seatType: String(req.query.seatType).trim() }
        : {}),
      ...(req.query.dayType
        ? { dayType: normalizeDayType(req.query.dayType) }
        : {}),
    };

    const pricingRules = await prisma.pricingRule.findMany({
      where,
      orderBy: [{ screenType: "asc" }, { seatType: "asc" }, { dayType: "asc" }],
    });

    return res.status(200).json(pricingRules);
  } catch (error) {
    return next(error);
  }
}

async function updatePricingRule(req, res, next) {
  try {
    const pricingId = parsePositiveInt(req.params.id);

    if (!pricingId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const existing = await prisma.pricingRule.findUnique({
      where: { id: pricingId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Pricing rule not found" });
    }

    const updated = await prisma.pricingRule.update({
      where: { id: pricingId },
      data: req.validatedBody,
    });

    return res.status(200).json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error:
          "A pricing rule already exists for this screenType + seatType + dayType",
      });
    }

    return next(error);
  }
}

async function deletePricingRule(req, res, next) {
  try {
    const pricingId = parsePositiveInt(req.params.id);

    if (!pricingId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const existing = await prisma.pricingRule.findUnique({
      where: { id: pricingId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Pricing rule not found" });
    }

    await prisma.pricingRule.delete({ where: { id: pricingId } });

    return res.status(200).json({ message: "Pricing rule deleted" });
  } catch (error) {
    return next(error);
  }
}

async function createShowtime(req, res, next) {
  try {
    const { movieId, screenId, startTime, endTime, basePrice, status } =
      req.validatedBody;

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      include: { theater: true },
    });

    if (!screen || !screen.isActive || !screen.theater.isActive) {
      return res.status(404).json({ error: "Screen not found or inactive" });
    }

    const windowError = validateShowtimeWindow({
      movieDuration: movie.duration,
      startTime,
      endTime,
    });

    if (windowError) {
      return res.status(400).json({ error: windowError });
    }

    const overlap = await ensureNoShowtimeOverlap({
      screenId,
      startTime,
      endTime,
    });
    if (overlap) {
      return res.status(409).json({
        error: "Screen already has an overlapping showtime",
        conflict: overlap,
      });
    }

    let resolvedBasePrice = basePrice;
    if (resolvedBasePrice === undefined) {
      const dayType = resolveDayType(startTime);
      const defaultRule = await prisma.pricingRule.findUnique({
        where: {
          screenType_seatType_dayType: {
            screenType: screen.screenType,
            seatType: "normal",
            dayType,
          },
        },
      });

      if (!defaultRule) {
        return res.status(400).json({
          error:
            "basePrice is required when no normal-seat pricing rule exists for this screen type and day type",
        });
      }

      resolvedBasePrice = Number(defaultRule.basePrice);
    }

    const showtime = await prisma.showtime.create({
      data: {
        movieId,
        screenId,
        startTime,
        endTime,
        basePrice: resolvedBasePrice,
        status: status || "scheduled",
      },
      include: {
        movie: true,
        screen: { include: { theater: true } },
      },
    });

    return res.status(201).json(showtime);
  } catch (error) {
    return next(error);
  }
}

async function listAdminShowtimes(req, res, next) {
  try {
    const where = {
      ...(req.query.movieId
        ? { movieId: parsePositiveInt(req.query.movieId) }
        : {}),
      ...(req.query.screenId
        ? { screenId: parsePositiveInt(req.query.screenId) }
        : {}),
      ...(req.query.status ? { status: String(req.query.status).trim() } : {}),
    };

    if (req.query.date) {
      const date = parseDate(String(req.query.date));
      if (!date) {
        return res.status(400).json({ error: "date must be a valid ISO date" });
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const showtimes = await prisma.showtime.findMany({
      where,
      include: {
        movie: true,
        screen: { include: { theater: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return res.status(200).json(showtimes);
  } catch (error) {
    return next(error);
  }
}

async function getAdminShowtime(req, res, next) {
  try {
    const showtimeId = parsePositiveInt(req.params.id);

    if (!showtimeId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        movie: true,
        screen: {
          include: {
            theater: true,
            seats: {
              where: { isActive: true },
              orderBy: [{ rowNumber: "asc" }, { columnNumber: "asc" }],
            },
          },
        },
      },
    });

    if (!showtime) {
      return res.status(404).json({ error: "Showtime not found" });
    }

    return res.status(200).json(showtime);
  } catch (error) {
    return next(error);
  }
}

async function updateShowtime(req, res, next) {
  try {
    const showtimeId = parsePositiveInt(req.params.id);

    if (!showtimeId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const existing = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: { movie: true, screen: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Showtime not found" });
    }

    const nextMovieId = req.validatedBody.movieId ?? existing.movieId;
    const nextScreenId = req.validatedBody.screenId ?? existing.screenId;
    const nextStartTime = req.validatedBody.startTime ?? existing.startTime;
    const nextEndTime = req.validatedBody.endTime ?? existing.endTime;

    const movie =
      nextMovieId === existing.movieId
        ? existing.movie
        : await prisma.movie.findUnique({ where: { id: nextMovieId } });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const screen =
      nextScreenId === existing.screenId
        ? await prisma.screen.findUnique({
            where: { id: existing.screenId },
            include: { theater: true },
          })
        : await prisma.screen.findUnique({
            where: { id: nextScreenId },
            include: { theater: true },
          });

    if (!screen || !screen.isActive || !screen.theater.isActive) {
      return res.status(404).json({ error: "Screen not found or inactive" });
    }

    const windowError = validateShowtimeWindow({
      movieDuration: movie.duration,
      startTime: nextStartTime,
      endTime: nextEndTime,
    });

    if (windowError) {
      return res.status(400).json({ error: windowError });
    }

    const overlap = await ensureNoShowtimeOverlap({
      screenId: nextScreenId,
      startTime: nextStartTime,
      endTime: nextEndTime,
      excludeId: showtimeId,
    });

    if (overlap) {
      return res.status(409).json({
        error: "Screen already has an overlapping showtime",
        conflict: overlap,
      });
    }

    const updated = await prisma.showtime.update({
      where: { id: showtimeId },
      data: req.validatedBody,
      include: {
        movie: true,
        screen: { include: { theater: true } },
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

async function listPublicShowtimes(req, res, next) {
  try {
    const includePast = req.query.includePast === "true";
    const where = {
      status: "scheduled",
      ...(req.query.movieId
        ? { movieId: parsePositiveInt(req.query.movieId) }
        : {}),
      ...(req.query.screenId
        ? { screenId: parsePositiveInt(req.query.screenId) }
        : {}),
      ...(includePast ? {} : { startTime: { gte: new Date() } }),
    };

    if (req.query.theaterId) {
      where.screen = { theaterId: parsePositiveInt(req.query.theaterId) };
    }

    if (req.query.date) {
      const date = parseDate(String(req.query.date));
      if (!date) {
        return res.status(400).json({ error: "date must be a valid ISO date" });
      }

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        ...(where.startTime || {}),
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const showtimes = await prisma.showtime.findMany({
      where,
      include: {
        movie: true,
        screen: {
          include: {
            theater: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    return res.status(200).json(showtimes);
  } catch (error) {
    return next(error);
  }
}

async function getShowtimeSeatAvailability(req, res, next) {
  try {
    const showtimeId = parsePositiveInt(req.params.id);

    if (!showtimeId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        movie: true,
        screen: {
          include: {
            theater: true,
            seats: {
              where: { isActive: true },
              orderBy: [{ rowNumber: "asc" }, { columnNumber: "asc" }],
            },
          },
        },
      },
    });

    if (!showtime || showtime.status !== "scheduled") {
      return res.status(404).json({ error: "Showtime not found" });
    }

    const now = new Date();

    const [bookedSeats, activeLocks, pricingData] = await Promise.all([
      prisma.bookingSeat.findMany({
        where: { showtimeId },
        select: { seatId: true },
      }),
      prisma.seatLock.findMany({
        where: {
          showtimeId,
          lockedUntil: { gt: now },
        },
        select: {
          seatId: true,
          userId: true,
          lockedUntil: true,
        },
      }),
      resolvePricingMap({
        screenType: showtime.screen.screenType,
        startTime: showtime.startTime,
      }),
    ]);

    const bookedSeatIds = new Set(bookedSeats.map((entry) => entry.seatId));
    const activeLockBySeatId = new Map(
      activeLocks.map((entry) => [entry.seatId, entry]),
    );

    const seats = showtime.screen.seats.map((seat) => {
      const booked = bookedSeatIds.has(seat.id);
      const lock = activeLockBySeatId.get(seat.id);
      const locked = Boolean(lock);

      const resolvedPrice =
        pricingData.priceBySeatType.get(seat.seatType) ??
        Number(showtime.basePrice);

      return {
        id: seat.id,
        seatNumber: seat.seatNumber,
        rowNumber: seat.rowNumber,
        columnNumber: seat.columnNumber,
        seatType: seat.seatType,
        availability: booked ? "booked" : locked ? "locked" : "available",
        lockedUntil: lock ? lock.lockedUntil : null,
        price: resolvedPrice,
      };
    });

    const summary = {
      totalSeats: seats.length,
      availableSeats: seats.filter((seat) => seat.availability === "available")
        .length,
      lockedSeats: seats.filter((seat) => seat.availability === "locked")
        .length,
      bookedSeats: seats.filter((seat) => seat.availability === "booked")
        .length,
      dayType: pricingData.dayType,
    };

    return res.status(200).json({
      showtime: {
        id: showtime.id,
        startTime: showtime.startTime,
        endTime: showtime.endTime,
        basePrice: Number(showtime.basePrice),
        movie: showtime.movie,
        screen: {
          id: showtime.screen.id,
          name: showtime.screen.name,
          screenType: showtime.screen.screenType,
          theater: showtime.screen.theater,
        },
      },
      summary,
      seats,
    });
  } catch (error) {
    return next(error);
  }
}

async function getShowtimePricing(req, res, next) {
  try {
    const showtimeId = parsePositiveInt(req.params.id);

    if (!showtimeId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const showtime = await prisma.showtime.findUnique({
      where: { id: showtimeId },
      include: {
        screen: true,
      },
    });

    if (!showtime) {
      return res.status(404).json({ error: "Showtime not found" });
    }

    const pricingData = await resolvePricingMap({
      screenType: showtime.screen.screenType,
      startTime: showtime.startTime,
    });

    const seatTypePricing = SEAT_TYPES.map((seatType) => {
      const rulePrice = pricingData.priceBySeatType.get(seatType);

      return {
        seatType,
        price: rulePrice ?? Number(showtime.basePrice),
        source:
          rulePrice !== undefined ? "pricing_rule" : "showtime_base_price",
      };
    });

    return res.status(200).json({
      showtimeId: showtime.id,
      screenType: showtime.screen.screenType,
      dayType: pricingData.dayType,
      seatTypePricing,
    });
  } catch (error) {
    return next(error);
  }
}

function validatePricingRuleBody(body, { partial = false } = {}) {
  const errors = [];
  if (partial && Object.keys(body).length === 0) {
    errors.push("Request body must contain at least one updatable field");
  }

  const screenType =
    body.screenType !== undefined
      ? normalizeScreenType(body.screenType)
      : undefined;
  const seatType =
    body.seatType !== undefined ? String(body.seatType).trim() : undefined;
  const dayType =
    body.dayType !== undefined ? normalizeDayType(body.dayType) : undefined;
  const basePrice = parseOptionalDecimal(body.basePrice);

  if (!partial || body.screenType !== undefined) {
    if (!screenType) {
      errors.push(
        "screenType is required and must be one of: regular, imax, 3d, 4dx",
      );
    }
  }

  if (!partial || body.seatType !== undefined) {
    if (!seatType || !SEAT_TYPES.includes(seatType)) {
      errors.push(
        `seatType is required and must be one of: ${SEAT_TYPES.join(", ")}`,
      );
    }
  }

  if (!partial || body.dayType !== undefined) {
    if (!dayType) {
      errors.push(
        "dayType is required and must be one of: weekday, weekend, holiday",
      );
    }
  }

  if (!partial || body.basePrice !== undefined) {
    if (basePrice === null || basePrice === undefined) {
      errors.push("basePrice is required and must be a positive number");
    }
  }

  return {
    errors,
    value: {
      ...(screenType !== undefined ? { screenType } : {}),
      ...(seatType !== undefined ? { seatType } : {}),
      ...(dayType !== undefined ? { dayType } : {}),
      ...(basePrice !== undefined ? { basePrice } : {}),
    },
  };
}

function validateCreateShowtimeBody(body) {
  const errors = [];
  const movieId = parsePositiveInt(body.movieId);
  const screenId = parsePositiveInt(body.screenId);
  const startTime = parseDate(body.startTime);
  const endTime = parseDate(body.endTime);
  const basePrice = parseOptionalDecimal(body.basePrice);
  const status =
    body.status !== undefined
      ? String(body.status).trim().toLowerCase()
      : undefined;

  if (!movieId) {
    errors.push("movieId is required and must be a positive integer");
  }

  if (!screenId) {
    errors.push("screenId is required and must be a positive integer");
  }

  if (!startTime) {
    errors.push("startTime is required and must be a valid ISO date-time");
  }

  if (!endTime) {
    errors.push("endTime is required and must be a valid ISO date-time");
  }

  if (body.basePrice !== undefined && basePrice === null) {
    errors.push("basePrice must be a positive number when provided");
  }

  const validStatuses = ["scheduled", "cancelled", "completed"];
  if (status !== undefined && !validStatuses.includes(status)) {
    errors.push(`status must be one of: ${validStatuses.join(", ")}`);
  }

  return {
    errors,
    value: {
      movieId,
      screenId,
      startTime,
      endTime,
      ...(basePrice !== undefined ? { basePrice } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  };
}

function validateUpdateShowtimeBody(body) {
  const errors = [];
  const movieId =
    body.movieId !== undefined ? parsePositiveInt(body.movieId) : undefined;
  const screenId =
    body.screenId !== undefined ? parsePositiveInt(body.screenId) : undefined;
  const startTime =
    body.startTime !== undefined ? parseDate(body.startTime) : undefined;
  const endTime =
    body.endTime !== undefined ? parseDate(body.endTime) : undefined;
  const basePrice =
    body.basePrice !== undefined
      ? parseOptionalDecimal(body.basePrice)
      : undefined;
  const status =
    body.status !== undefined
      ? String(body.status).trim().toLowerCase()
      : undefined;

  if (Object.keys(body).length === 0) {
    errors.push("Request body must contain at least one updatable field");
  }

  if (body.movieId !== undefined && !movieId) {
    errors.push("movieId must be a positive integer when provided");
  }

  if (body.screenId !== undefined && !screenId) {
    errors.push("screenId must be a positive integer when provided");
  }

  if (body.startTime !== undefined && !startTime) {
    errors.push("startTime must be a valid ISO date-time when provided");
  }

  if (body.endTime !== undefined && !endTime) {
    errors.push("endTime must be a valid ISO date-time when provided");
  }

  if (
    body.basePrice !== undefined &&
    (basePrice === null || basePrice === undefined)
  ) {
    errors.push("basePrice must be a positive number when provided");
  }

  const validStatuses = ["scheduled", "cancelled", "completed"];
  if (status !== undefined && !validStatuses.includes(status)) {
    errors.push(`status must be one of: ${validStatuses.join(", ")}`);
  }

  return {
    errors,
    value: {
      ...(movieId !== undefined ? { movieId } : {}),
      ...(screenId !== undefined ? { screenId } : {}),
      ...(startTime !== undefined ? { startTime } : {}),
      ...(endTime !== undefined ? { endTime } : {}),
      ...(basePrice !== undefined ? { basePrice } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  };
}

module.exports = {
  createPricingRule,
  listPricingRules,
  updatePricingRule,
  deletePricingRule,
  createShowtime,
  listAdminShowtimes,
  getAdminShowtime,
  updateShowtime,
  listPublicShowtimes,
  getShowtimeSeatAvailability,
  getShowtimePricing,
  validatePricingRuleBody,
  validateCreateShowtimeBody,
  validateUpdateShowtimeBody,
};
