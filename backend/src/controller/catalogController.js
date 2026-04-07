const prisma = require("../lib/prisma");

// ==========================================
// THEATER CONTROLLERS
// ==========================================

async function createTheater(req, res, next) {
  try {
    const { name, location } = req.validatedBody;

    const theater = await prisma.theater.create({
      data: {
        name,
        location,
        isActive: true,
      },
      include: {
        screens: true,
      },
    });

    return res.status(201).json(theater);
  } catch (error) {
    return next(error);
  }
}

async function listTheaters(req, res, next) {
  try {
    const { includeInactive } = req.query;
    const where = includeInactive !== "true" ? { isActive: true } : {};

    const theaters = await prisma.theater.findMany({
      where,
      include: {
        screens: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(theaters);
  } catch (error) {
    return next(error);
  }
}


async function getTheater(req, res, next) {
  try {
    const { id } = req.params;
    const theaterId = Number(id);

    const theater = await prisma.theater.findUnique({
      where: { id: theaterId },
      include: {
        screens: {
          include: {
            seats: {},
            showtimes: {},
          },
        },
      },
    });

    if (!theater) {
      return res.status(404).json({ error: "Theater not found" });
    }

    return res.status(200).json(theater);
  } catch (error) {
    return next(error);
  }
}

async function updateTheater(req, res, next) {
  try {
    const { id } = req.params;
    const { name, location, isActive } = req.validatedBody;
    const theaterId = Number(id);

    const theater = await prisma.theater.findUnique({
      where: { id: theaterId },
    });

    if (!theater) {
      return res.status(404).json({ error: "Theater not found" });
    }

    const updated = await prisma.theater.update({
      where: { id: theaterId },
      data: {
        ...(name !== undefined && { name }),
        ...(location !== undefined && { location }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        screens: true,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deleteTheater(req, res, next) {
  try {
    const { id } = req.params;
    const theaterId = Number(id);

    const theater = await prisma.theater.findUnique({
      where: { id: theaterId },
    });

    if (!theater) {
      return res.status(404).json({ error: "Theater not found" });
    }

    // Soft delete by marking as inactive
    const updated = await prisma.theater.update({
      where: { id: theaterId },
      data: { isActive: false },
    });

    return res
      .status(200)
      .json({ message: "Theater deleted", theater: updated });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// SCREEN CONTROLLERS
// ==========================================

async function createScreen(req, res, next) {
  try {
    const { theaterId, name, screenType, totalRows, totalColumns } =
      req.validatedBody;
    const screenIdNum = Number(theaterId);

    // Verify theater exists
    const theater = await prisma.theater.findUnique({
      where: { id: screenIdNum },
    });

    if (!theater) {
      return res.status(404).json({ error: "Theater not found" });
    }

    // Create screen and generate seats in a transaction
    const screen = await prisma.$transaction(async (tx) => {
      const newScreen = await tx.screen.create({
        data: {
          theaterId: screenIdNum,
          name,
          screenType: screenType || "regular",
          totalRows,
          totalColumns,
          isActive: true,
        },
      });

      // Generate seats for the screen
      const seats = [];
      for (let row = 1; row <= totalRows; row++) {
        for (let col = 1; col <= totalColumns; col++) {
          const rowLetter = String.fromCharCode(64 + row); // A, B, C, ...
          seats.push({
            screenId: newScreen.id,
            seatNumber: `${rowLetter}${col}`,
            rowNumber: row,
            columnNumber: col,
            seatType: "normal",
            isActive: true,
          });
        }
      }

      // Batch insert seats
      await tx.seat.createMany({
        data: seats,
      });

      return newScreen;
    });

    // Fetch screen with seats
    const screenWithSeats = await prisma.screen.findUnique({
      where: { id: screen.id },
      include: { seats: true },
    });

    return res.status(201).json(screenWithSeats);
  } catch (error) {
    return next(error);
  }
}

async function listScreens(req, res, next) {
  try {
    const { theaterId, includeInactive } = req.query;
    const where = {
      ...(theaterId && { theaterId: Number(theaterId) }),
      ...(includeInactive !== "true" && { isActive: true }),
    };

    const screens = await prisma.screen.findMany({
      where,
      include: {
        theater: true,
        seats: { where: { isActive: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(screens);
  } catch (error) {
    return next(error);
  }
}

async function getScreen(req, res, next) {
  try {
    const { id } = req.params;
    const screenId = Number(id);

    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
      include: {
        theater: true,
        seats: true,
        showtimes: { include: { movie: true } },
      },
    });

    if (!screen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    return res.status(200).json(screen);
  } catch (error) {
    return next(error);
  }
}

async function updateScreen(req, res, next) {
  try {
    const { id } = req.params;
    const { name, screenType, isActive } = req.validatedBody;
    const screenId = Number(id);

    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
    });

    if (!screen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    const updated = await prisma.screen.update({
      where: { id: screenId },
      data: {
        ...(name !== undefined && { name }),
        ...(screenType !== undefined && { screenType }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        seats: true,
        theater: true,
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deleteScreen(req, res, next) {
  try {
    const { id } = req.params;
    const screenId = Number(id);

    const screen = await prisma.screen.findUnique({
      where: { id: screenId },
    });

    if (!screen) {
      return res.status(404).json({ error: "Screen not found" });
    }

    // Soft delete by marking as inactive
    const updated = await prisma.screen.update({
      where: { id: screenId },
      data: { isActive: false },
    });

    return res.status(200).json({ message: "Screen deleted", screen: updated });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// MOVIE CONTROLLERS
// ==========================================

async function createMovie(req, res, next) {
  try {
    const {
      title,
      duration,
      description,
      releaseDate,
      posterUrl,
      language,
      ageRating,
      status,
    } = req.validatedBody;

    const movie = await prisma.movie.create({
      data: {
        title,
        duration,
        description,
        ...(releaseDate && { releaseDate: new Date(releaseDate) }),
        posterUrl,
        language,
        ageRating: ageRating || "PG",
        status: status || "upcoming",
      },
      include: {
        genres: { include: { genre: true } },
      },
    });

    return res.status(201).json(movie);
  } catch (error) {
    return next(error);
  }
}

async function listMovies(req, res, next) {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};

    const movies = await prisma.movie.findMany({
      where,
      include: {
        genres: { include: { genre: true } },
        showtimes: { include: { screen: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(movies);
  } catch (error) {
    return next(error);
  }
}

async function getMovie(req, res, next) {
  try {
    const { id } = req.params;
    const movieId = Number(id);

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
      include: {
        genres: { include: { genre: true } },
        showtimes: { include: { screen: { include: { theater: true } } } },
        reviews: { include: { user: true } },
      },
    });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    return res.status(200).json(movie);
  } catch (error) {
    return next(error);
  }
}

async function updateMovie(req, res, next) {
  try {
    const { id } = req.params;
    const {
      title,
      duration,
      description,
      releaseDate,
      posterUrl,
      language,
      ageRating,
      status,
    } = req.validatedBody;
    const movieId = Number(id);

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const updated = await prisma.movie.update({
      where: { id: movieId },
      data: {
        ...(title !== undefined && { title }),
        ...(duration !== undefined && { duration }),
        ...(description !== undefined && { description }),
        ...(releaseDate !== undefined && {
          releaseDate: new Date(releaseDate),
        }),
        ...(posterUrl !== undefined && { posterUrl }),
        ...(language !== undefined && { language }),
        ...(ageRating !== undefined && { ageRating }),
        ...(status !== undefined && { status }),
      },
      include: {
        genres: { include: { genre: true } },
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deleteMovie(req, res, next) {
  try {
    const { id } = req.params;
    const movieId = Number(id);

    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    // Soft delete by setting status to ended
    const updated = await prisma.movie.update({
      where: { id: movieId },
      data: { status: "ended" },
    });

    return res.status(200).json({
      message: "Movie deleted",
      movie: updated,
    });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// GENRE CONTROLLERS
// ==========================================

async function createGenre(req, res, next) {
  try {
    const { name } = req.validatedBody;

    // Check if genre already exists
    const existing = await prisma.genre.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(409).json({ error: "Genre already exists" });
    }

    const genre = await prisma.genre.create({
      data: { name },
    });

    return res.status(201).json(genre);
  } catch (error) {
    return next(error);
  }
}

async function listGenres(req, res, next) {
  try {
    const genres = await prisma.genre.findMany({
      include: {
        movies: { include: { movie: true } },
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json(genres);
  } catch (error) {
    return next(error);
  }
}

async function getGenre(req, res, next) {
  try {
    const { id } = req.params;
    const genreId = Number(id);

    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
      include: {
        movies: {
          include: {
            movie: true,
          },
        },
      },
    });

    if (!genre) {
      return res.status(404).json({ error: "Genre not found" });
    }

    return res.status(200).json(genre);
  } catch (error) {
    return next(error);
  }
}

async function updateGenre(req, res, next) {
  try {
    const { id } = req.params;
    const { name } = req.validatedBody;
    const genreId = Number(id);

    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      return res.status(404).json({ error: "Genre not found" });
    }

    // Check if new name already exists
    if (name !== genre.name) {
      const existing = await prisma.genre.findUnique({
        where: { name },
      });
      if (existing) {
        return res.status(409).json({ error: "Genre name already exists" });
      }
    }

    const updated = await prisma.genre.update({
      where: { id: genreId },
      data: { name },
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deleteGenre(req, res, next) {
  try {
    const { id } = req.params;
    const genreId = Number(id);

    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      return res.status(404).json({ error: "Genre not found" });
    }

    // Delete genre (will cascade delete movie_genres)
    await prisma.genre.delete({
      where: { id: genreId },
    });

    return res.status(200).json({ message: "Genre deleted" });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// MOVIE GENRE CONTROLLERS
// ==========================================

async function addGenreToMovie(req, res, next) {
  try {
    const { movieId, genreId } = req.validatedBody;

    // Check if movie and genre exist
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      return res.status(404).json({ error: "Movie not found" });
    }

    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      return res.status(404).json({ error: "Genre not found" });
    }

    // Check if association already exists
    const existing = await prisma.movieGenre.findUnique({
      where: {
        movieId_genreId: { movieId, genreId },
      },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "Genre already associated with movie" });
    }

    const movieGenre = await prisma.movieGenre.create({
      data: { movieId, genreId },
      include: {
        movie: true,
        genre: true,
      },
    });

    return res.status(201).json(movieGenre);
  } catch (error) {
    return next(error);
  }
}

async function removeGenreFromMovie(req, res, next) {
  try {
    const { movieId, genreId } = req.params;
    const movieIdNum = Number(movieId);
    const genreIdNum = Number(genreId);

    const movieGenre = await prisma.movieGenre.findUnique({
      where: {
        movieId_genreId: { movieId: movieIdNum, genreId: genreIdNum },
      },
    });

    if (!movieGenre) {
      return res.status(404).json({ error: "Genre association not found" });
    }

    await prisma.movieGenre.delete({
      where: {
        movieId_genreId: { movieId: movieIdNum, genreId: genreIdNum },
      },
    });

    return res.status(200).json({ message: "Genre removed from movie" });
  } catch (error) {
    return next(error);
  }
}

// ==========================================
// MENU ITEM CONTROLLERS
// ==========================================

async function createMenuItem(req, res, next) {
  try {
    const { name, description, price, category } = req.validatedBody;

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        category,
        isAvailable: true,
      },
    });

    return res.status(201).json(menuItem);
  } catch (error) {
    return next(error);
  }
}

async function listMenuItems(req, res, next) {
  try {
    const { category, availableOnly } = req.query;
    const where = {
      ...(category && { category }),
      ...(availableOnly === "true" && { isAvailable: true }),
    };

    const menuItems = await prisma.menuItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(menuItems);
  } catch (error) {
    return next(error);
  }
}

async function getMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    const menuItemId = Number(id);

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    return res.status(200).json(menuItem);
  } catch (error) {
    return next(error);
  }
}

async function updateMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, price, category, isAvailable } =
      req.validatedBody;
    const menuItemId = Number(id);

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    const updated = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(category !== undefined && { category }),
        ...(isAvailable !== undefined && { isAvailable }),
      },
    });

    return res.status(200).json(updated);
  } catch (error) {
    return next(error);
  }
}

async function deleteMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    const menuItemId = Number(id);

    const menuItem = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      return res.status(404).json({ error: "Menu item not found" });
    }

    // Soft delete by marking as unavailable
    const updated = await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { isAvailable: false },
    });

    return res
      .status(200)
      .json({ message: "Menu item deleted", menuItem: updated });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  // Theater
  createTheater,
  listTheaters,
  getTheater,
  updateTheater,
  deleteTheater,
  // Screen
  createScreen,
  listScreens,
  getScreen,
  updateScreen,
  deleteScreen,
  // Movie
  createMovie,
  listMovies,
  getMovie,
  updateMovie,
  deleteMovie,
  // Genre
  createGenre,
  listGenres,
  getGenre,
  updateGenre,
  deleteGenre,
  // Movie Genre
  addGenreToMovie,
  removeGenreFromMovie,
  // Menu Item
  createMenuItem,
  listMenuItems,
  getMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
