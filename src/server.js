const express = require("express");
const prisma = require("./lib/prisma");
const app = express();

app.use(express.json());

app.post("/movies/test", (req, res) => {
  res.status(200).json({
    message: "Request body received",
    body: req.body,
  });
});

// test route to check if the server is running
app.post("/movies", async (req, res) => {
  const { title, duration, language } = req.body;

  if (!title || !duration) {
    return res.status(400).json({
      error: "title and duration are required in the request body",
    });
  }

  try {
    const movie = await prisma.movie.create({
      data: { title, duration, language },
    });
    res.json(movie);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
