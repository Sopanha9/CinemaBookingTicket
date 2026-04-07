const prisma = require("../lib/prisma");

const MAX_LOCK_MINUTES = 15;
const DEFAULT_LOCK_MINUTES = 5;
const ALLOWED_STATUS_TRANSITIONS = {
  pending: new Set(["confirmed", "cancelled"]),
  confirmed: new Set(["cancelled"]),
  cancelled: new Set(),
};

function parsePositiveInt(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }

  return num;
}

function parseSeatIds(rawSeatIds) {
  if (!Array.isArray(rawSeatIds) || rawSeatIds.length === 0) {
    return null;
  }

  const normalized = rawSeatIds
    .map((value) => parsePositiveInt(value))
    .filter((value) => value !== null);

  if (normalized.length !== rawSeatIds.length) {
    return null;
  }

  return [...new Set(normalized)];
}

function parseLockMinutes(value) {
  if (value === undefined) {
    return DEFAULT_LOCK_MINUTES;
  }

  const minutes = parsePositiveInt(value);
  if (!minutes) {
    return null;
  }

  return Math.min(minutes, MAX_LOCK_MINUTES);
}

function resolveDayType(startTime) {
  const holidayConfig = process.env.HOLIDAY_DATES || "";
  const holidays = new Set(
    holidayConfig
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

  const key = startTime.toISOString().slice(0, 10);
  if (holidays.has(key)) {
    return "holiday";
  }

  const day = startTime.getUTCDay();
  if (day === 0 || day === 6) {
    return "weekend";
  }

  return "weekday";
}

async function validateShowtimeAndSeats(tx, { showtimeId, seatIds }) {
  const showtime = await tx.showtime.findUnique({
    where: { id: showtimeId },
    include: {
      screen: true,
      movie: true,
    },
  });

  if (!showtime || showtime.status !== "scheduled") {
    return { error: { status: 404, message: "Showtime not found" } };
  }

  const seats = await tx.seat.findMany({
    where: {
      id: { in: seatIds },
      screenId: showtime.screenId,
      isActive: true,
    },
    orderBy: [{ rowNumber: "asc" }, { columnNumber: "asc" }],
  });

  if (seats.length !== seatIds.length) {
    return {
      error: {
        status: 400,
        message: "One or more seats are invalid for this showtime",
      },
    };
  }

  return { showtime, seats };
}

async function assertSeatsNotBooked(tx, { showtimeId, seatIds }) {
  const existingBookings = await tx.bookingSeat.findMany({
    where: {
      showtimeId,
      seatId: { in: seatIds },
    },
    select: { seatId: true },
  });

  if (existingBookings.length > 0) {
    return {
      status: 409,
      message: "One or more seats are already booked",
      seatIds: existingBookings.map((entry) => entry.seatId),
    };
  }

  return null;
}

async function assertSeatsNotLockedByOthers(
  tx,
  { showtimeId, seatIds, userId, now },
) {
  const locks = await tx.seatLock.findMany({
    where: {
      showtimeId,
      seatId: { in: seatIds },
      lockedUntil: { gt: now },
      userId: { not: userId },
    },
    select: {
      seatId: true,
      userId: true,
      lockedUntil: true,
    },
  });

  if (locks.length > 0) {
    return {
      status: 409,
      message: "One or more seats are currently locked by another user",
      locks,
    };
  }

  return null;
}

async function upsertSeatLocks(
  tx,
  { showtimeId, seatIds, userId, lockedUntil },
) {
  for (const seatId of seatIds) {
    await tx.seatLock.upsert({
      where: {
        seatId_showtimeId: {
          seatId,
          showtimeId,
        },
      },
      update: {
        userId,
        lockedUntil,
      },
      create: {
        seatId,
        showtimeId,
        userId,
        lockedUntil,
      },
    });
  }

  return tx.seatLock.findMany({
    where: {
      showtimeId,
      seatId: { in: seatIds },
      userId,
      lockedUntil: { gt: new Date() },
    },
    orderBy: { seatId: "asc" },
  });
}

async function createSeatLocks(req, res, next) {
  try {
    const userId = Number(req.auth.sub);
    const { showtimeId, seatIds, lockMinutes } = req.validatedBody;
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      await tx.seatLock.deleteMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          lockedUntil: { lte: now },
        },
      });

      const { error } = await validateShowtimeAndSeats(tx, {
        showtimeId,
        seatIds,
      });
      if (error) {
        return { error };
      }

      const bookedConflict = await assertSeatsNotBooked(tx, {
        showtimeId,
        seatIds,
      });
      if (bookedConflict) {
        return { error: bookedConflict };
      }

      const lockConflict = await assertSeatsNotLockedByOthers(tx, {
        showtimeId,
        seatIds,
        userId,
        now,
      });
      if (lockConflict) {
        return { error: lockConflict };
      }

      const locks = await upsertSeatLocks(tx, {
        showtimeId,
        seatIds,
        userId,
        lockedUntil,
      });

      return { locks };
    });

    if (result.error) {
      return res.status(result.error.status).json({
        error: result.error.message,
        ...(result.error.seatIds ? { seatIds: result.error.seatIds } : {}),
        ...(result.error.locks ? { locks: result.error.locks } : {}),
      });
    }

    return res.status(201).json({
      showtimeId,
      lockMinutes,
      lockedUntil,
      locks: result.locks,
    });
  } catch (error) {
    return next(error);
  }
}

async function extendSeatLocks(req, res, next) {
  try {
    const userId = Number(req.auth.sub);
    const { showtimeId, seatIds, lockMinutes } = req.validatedBody;
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const activeLocks = await tx.seatLock.findMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          userId,
          lockedUntil: { gt: now },
        },
        select: { id: true, seatId: true },
      });

      if (activeLocks.length !== seatIds.length) {
        return {
          error: {
            status: 409,
            message:
              "All requested seats must be actively locked by the current user",
            seatIds: activeLocks.map((lock) => lock.seatId),
          },
        };
      }

      await tx.seatLock.updateMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          userId,
          lockedUntil: { gt: now },
        },
        data: {
          lockedUntil,
        },
      });

      const locks = await tx.seatLock.findMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          userId,
          lockedUntil: { gt: now },
        },
        orderBy: { seatId: "asc" },
      });

      return { locks };
    });

    if (result.error) {
      return res.status(result.error.status).json({
        error: result.error.message,
        seatIds: result.error.seatIds,
      });
    }

    return res.status(200).json({
      showtimeId,
      lockMinutes,
      lockedUntil,
      locks: result.locks,
    });
  } catch (error) {
    return next(error);
  }
}

async function releaseSeatLocks(req, res, next) {
  try {
    const userId = Number(req.auth.sub);
    const { showtimeId, seatIds } = req.validatedBody;

    const deleted = await prisma.seatLock.deleteMany({
      where: {
        showtimeId,
        userId,
        ...(seatIds ? { seatId: { in: seatIds } } : {}),
      },
    });

    return res.status(200).json({
      showtimeId,
      releasedCount: deleted.count,
    });
  } catch (error) {
    return next(error);
  }
}

async function createBooking(req, res, next) {
  try {
    const userId = Number(req.auth.sub);
    const { showtimeId, seatIds } = req.validatedBody;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      await tx.seatLock.deleteMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          lockedUntil: { lte: now },
        },
      });

      const validated = await validateShowtimeAndSeats(tx, {
        showtimeId,
        seatIds,
      });
      if (validated.error) {
        return { error: validated.error };
      }

      const bookedConflict = await assertSeatsNotBooked(tx, {
        showtimeId,
        seatIds,
      });
      if (bookedConflict) {
        return { error: bookedConflict };
      }

      const activeLocks = await tx.seatLock.findMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          userId,
          lockedUntil: { gt: now },
        },
        select: {
          seatId: true,
        },
      });

      if (activeLocks.length !== seatIds.length) {
        return {
          error: {
            status: 409,
            message:
              "All seats must be actively locked by the current user before booking",
            seatIds: activeLocks.map((lock) => lock.seatId),
          },
        };
      }

      const dayType = resolveDayType(validated.showtime.startTime);
      const pricingRules = await tx.pricingRule.findMany({
        where: {
          screenType: validated.showtime.screen.screenType,
          dayType,
        },
      });

      const pricingBySeatType = new Map();
      for (const rule of pricingRules) {
        pricingBySeatType.set(rule.seatType, Number(rule.basePrice));
      }

      const bookingSeatRows = validated.seats.map((seat) => ({
        seatId: seat.id,
        showtimeId,
        price:
          pricingBySeatType.get(seat.seatType) ??
          Number(validated.showtime.basePrice),
      }));

      const totalAmount = bookingSeatRows.reduce(
        (sum, row) => sum + row.price,
        0,
      );

      const booking = await tx.booking.create({
        data: {
          userId,
          showtimeId,
          status: "pending",
          totalAmount,
        },
      });

      await tx.bookingSeat.createMany({
        data: bookingSeatRows.map((row) => ({
          bookingId: booking.id,
          showtimeId: row.showtimeId,
          seatId: row.seatId,
          price: row.price,
        })),
      });

      await tx.seatLock.deleteMany({
        where: {
          showtimeId,
          seatId: { in: seatIds },
          userId,
        },
      });

      const bookingWithSeats = await tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          bookingSeats: {
            include: {
              seat: true,
            },
            orderBy: { seatId: "asc" },
          },
          showtime: {
            include: {
              movie: true,
              screen: {
                include: {
                  theater: true,
                },
              },
            },
          },
        },
      });

      return { booking: bookingWithSeats };
    });

    if (result.error) {
      return res.status(result.error.status).json({
        error: result.error.message,
        ...(result.error.seatIds ? { seatIds: result.error.seatIds } : {}),
      });
    }

    return res.status(201).json(result.booking);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error:
          "One or more seats were booked concurrently. Please retry with fresh availability.",
      });
    }

    return next(error);
  }
}

function canTransitionStatus(from, to) {
  return ALLOWED_STATUS_TRANSITIONS[from]?.has(to) || false;
}

async function updateBookingStatus(req, res, next) {
  try {
    const bookingId = parsePositiveInt(req.params.id);
    const userId = Number(req.auth.sub);
    const role = req.auth.role;
    const { status, cancellationReason } = req.validatedBody;

    if (!bookingId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isOwner = booking.userId === userId;
    const isAdmin = role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!canTransitionStatus(booking.status, status)) {
      return res.status(400).json({
        error: `Invalid status transition from ${booking.status} to ${status}`,
      });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        ...(status === "cancelled"
          ? { cancellationReason: cancellationReason || "Cancelled by user" }
          : {}),
      },
      include: {
        bookingSeats: {
          include: {
            seat: true,
          },
        },
        showtime: {
          include: {
            movie: true,
            screen: {
              include: {
                theater: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

async function listMyBookings(req, res, next) {
  try {
    const userId = Number(req.auth.sub);

    const bookings = await prisma.booking.findMany({
      where: {
        userId,
      },
      include: {
        bookingSeats: {
          include: {
            seat: true,
          },
        },
        showtime: {
          include: {
            movie: true,
            screen: {
              include: {
                theater: true,
              },
            },
          },
        },
      },
      orderBy: {
        bookingTime: "desc",
      },
    });

    return res.status(200).json(bookings);
  } catch (error) {
    return next(error);
  }
}

async function getMyBooking(req, res, next) {
  try {
    const bookingId = parsePositiveInt(req.params.id);
    const userId = Number(req.auth.sub);
    const role = req.auth.role;

    if (!bookingId) {
      return res.status(400).json({ error: "id must be a positive integer" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSeats: {
          include: {
            seat: true,
          },
        },
        showtime: {
          include: {
            movie: true,
            screen: {
              include: {
                theater: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const isOwner = booking.userId === userId;
    const isAdmin = role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json(booking);
  } catch (error) {
    return next(error);
  }
}

function validateLockBody(body) {
  const errors = [];
  const showtimeId = parsePositiveInt(body.showtimeId);
  const seatIds = parseSeatIds(body.seatIds);
  const lockMinutes = parseLockMinutes(body.lockMinutes);

  if (!showtimeId) {
    errors.push("showtimeId is required and must be a positive integer");
  }

  if (!seatIds) {
    errors.push(
      "seatIds is required and must be a non-empty array of positive integers",
    );
  }

  if (lockMinutes === null) {
    errors.push("lockMinutes must be a positive integer when provided");
  }

  return {
    errors,
    value: {
      showtimeId,
      seatIds,
      lockMinutes,
    },
  };
}

function validateReleaseLockBody(body) {
  const errors = [];
  const showtimeId = parsePositiveInt(body.showtimeId);
  const seatIds =
    body.seatIds === undefined ? undefined : parseSeatIds(body.seatIds);

  if (!showtimeId) {
    errors.push("showtimeId is required and must be a positive integer");
  }

  if (body.seatIds !== undefined && !seatIds) {
    errors.push(
      "seatIds must be a non-empty array of positive integers when provided",
    );
  }

  return {
    errors,
    value: {
      showtimeId,
      seatIds,
    },
  };
}

function validateCreateBookingBody(body) {
  const errors = [];
  const showtimeId = parsePositiveInt(body.showtimeId);
  const seatIds = parseSeatIds(body.seatIds);

  if (!showtimeId) {
    errors.push("showtimeId is required and must be a positive integer");
  }

  if (!seatIds) {
    errors.push(
      "seatIds is required and must be a non-empty array of positive integers",
    );
  }

  return {
    errors,
    value: {
      showtimeId,
      seatIds,
    },
  };
}

function validateBookingStatusBody(body) {
  const errors = [];
  const status =
    body.status !== undefined ? String(body.status).trim().toLowerCase() : "";
  const cancellationReason =
    body.cancellationReason !== undefined
      ? String(body.cancellationReason).trim()
      : undefined;

  const allowedStatuses = ["confirmed", "cancelled"];
  if (!allowedStatuses.includes(status)) {
    errors.push(
      `status is required and must be one of: ${allowedStatuses.join(", ")}`,
    );
  }

  if (status === "cancelled" && cancellationReason === "") {
    errors.push("cancellationReason must be a non-empty string when provided");
  }

  return {
    errors,
    value: {
      status,
      cancellationReason,
    },
  };
}

module.exports = {
  createSeatLocks,
  extendSeatLocks,
  releaseSeatLocks,
  createBooking,
  updateBookingStatus,
  listMyBookings,
  getMyBooking,
  validateLockBody,
  validateReleaseLockBody,
  validateCreateBookingBody,
  validateBookingStatusBody,
};
