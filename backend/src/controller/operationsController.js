const prisma = require("../lib/prisma");

async function cleanupExpiredSeatLocks(req, res, next) {
  try {
    const now = new Date();

    const deleted = await prisma.seatLock.deleteMany({
      where: {
        lockedUntil: {
          lte: now,
        },
      },
    });

    return res.status(200).json({
      message: "Expired seat locks cleanup completed",
      deletedCount: deleted.count,
      cleanedAt: now.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  cleanupExpiredSeatLocks,
};
