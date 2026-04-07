const prisma = require("../lib/prisma");

async function createMovie(req, res, next) {
  try {
    const movie = await prisma.movie.create({
      data: req.validatedBody,
    });

    return res.status(201).json(movie);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createMovie,
};
