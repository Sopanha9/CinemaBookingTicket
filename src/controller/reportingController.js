const prisma = require("../lib/prisma");

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function normalizeDateRange(from, to) {
  const fromDate = parseDate(from);
  const toDate = parseDate(to);

  if (!fromDate || !toDate) {
    return null;
  }

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  if (fromDate > toDate) {
    return null;
  }

  return { fromDate, toDate };
}

async function getRevenueReport(req, res, next) {
  try {
    const { from, to } = req.query;
    const range = normalizeDateRange(from, to);

    if (from || to) {
      if (!range) {
        return res.status(400).json({
          error: "from and to must be valid dates and from must be <= to",
        });
      }
    }

    const where = {
      status: "paid",
      ...(range
        ? { paymentTime: { gte: range.fromDate, lte: range.toDate } }
        : {}),
    };

    const [summary, paymentCount] = await Promise.all([
      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
      }),
      prisma.payment.count({ where }),
    ]);

    return res.status(200).json({
      filters: {
        from: range ? range.fromDate.toISOString() : null,
        to: range ? range.toDate.toISOString() : null,
      },
      totalRevenue: Number(summary._sum.amount || 0),
      averagePaymentAmount: Number(summary._avg.amount || 0),
      paymentCount,
    });
  } catch (error) {
    return next(error);
  }
}

async function getBookingVolumeReport(req, res, next) {
  try {
    const { from, to, status } = req.query;
    const range = normalizeDateRange(from, to);

    if (from || to) {
      if (!range) {
        return res.status(400).json({
          error: "from and to must be valid dates and from must be <= to",
        });
      }
    }

    const where = {
      ...(status ? { status: String(status).trim().toLowerCase() } : {}),
      ...(range
        ? { bookingTime: { gte: range.fromDate, lte: range.toDate } }
        : {}),
    };

    const [totalBookings, byStatus] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
    ]);

    return res.status(200).json({
      filters: {
        from: range ? range.fromDate.toISOString() : null,
        to: range ? range.toDate.toISOString() : null,
        status: status || null,
      },
      totalBookings,
      byStatus: byStatus.map((entry) => ({
        status: entry.status,
        count: entry._count._all,
      })),
    });
  } catch (error) {
    return next(error);
  }
}

async function getOccupancyReport(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const showtimes = await prisma.showtime.findMany({
      where: {
        status: {
          in: ["scheduled", "completed"],
        },
      },
      include: {
        screen: {
          include: {
            theater: true,
            seats: {
              where: { isActive: true },
              select: { id: true },
            },
          },
        },
        bookingSeats: {
          select: { id: true },
        },
        movie: true,
      },
      orderBy: { startTime: "desc" },
      take: limit,
    });

    const rows = showtimes.map((showtime) => {
      const totalSeats = showtime.screen.seats.length;
      const bookedSeats = showtime.bookingSeats.length;
      const occupancyRate =
        totalSeats === 0 ? 0 : (bookedSeats / totalSeats) * 100;

      return {
        showtimeId: showtime.id,
        movieId: showtime.movieId,
        movieTitle: showtime.movie.title,
        theaterId: showtime.screen.theaterId,
        theaterName: showtime.screen.theater.name,
        screenId: showtime.screenId,
        screenName: showtime.screen.name,
        startTime: showtime.startTime,
        totalSeats,
        bookedSeats,
        occupancyRate: Number(occupancyRate.toFixed(2)),
      };
    });

    return res.status(200).json({
      count: rows.length,
      rows,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTopMoviesReport(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const movies = await prisma.movie.findMany({
      include: {
        showtimes: {
          include: {
            bookings: {
              include: {
                payments: true,
              },
            },
            bookingSeats: true,
          },
        },
      },
    });

    const ranking = movies
      .map((movie) => {
        let bookingCount = 0;
        let paidRevenue = 0;
        let soldSeats = 0;

        for (const showtime of movie.showtimes) {
          soldSeats += showtime.bookingSeats.length;
          bookingCount += showtime.bookings.length;

          for (const booking of showtime.bookings) {
            const paidPayments = booking.payments.filter(
              (payment) => payment.status === "paid",
            );
            for (const payment of paidPayments) {
              paidRevenue += Number(payment.amount);
            }
          }
        }

        return {
          movieId: movie.id,
          title: movie.title,
          status: movie.status,
          bookingCount,
          soldSeats,
          paidRevenue: Number(paidRevenue.toFixed(2)),
        };
      })
      .sort(
        (a, b) =>
          b.paidRevenue - a.paidRevenue || b.bookingCount - a.bookingCount,
      )
      .slice(0, limit);

    return res.status(200).json({
      count: ranking.length,
      rows: ranking,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getRevenueReport,
  getBookingVolumeReport,
  getOccupancyReport,
  getTopMoviesReport,
};
