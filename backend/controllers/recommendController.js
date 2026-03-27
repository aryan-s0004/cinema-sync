const Movie = require("../models/Movie");
const ApiResponse = require("../utils/ApiResponse");
const { discoverMoviesByGenreName } = require("../services/tmdbService");

const moodToGenre = {
  happy: "Comedy",
  sad: "Drama",
  excited: "Action",
  romantic: "Romance",
  thoughtful: "Science Fiction",
  family: "Family",
  scary: "Horror",
};

const callOpenAIForGenre = async ({ mood, genre }) => {
  if (!process.env.OPENAI_API_KEY) return null;

  const prompt = `Map this user intent to one movie genre only. Mood: ${mood || ""}, Genre hint: ${genre || ""}. Respond with only a single genre name.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 16,
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
};

const recommendMovies = async (req, res, next) => {
  try {
    const { mood, genre } = req.body || {};
    const aiGenre = await callOpenAIForGenre({ mood, genre });
    const selectedGenre = aiGenre || genre || moodToGenre[(mood || "").toLowerCase()] || "Action";

    let recommendations = [];
    if (process.env.TMDB_API_KEY) {
      recommendations = await discoverMoviesByGenreName(selectedGenre);
    } else {
      recommendations = await Movie.find({ isActive: true }).sort({ rating: -1, popularity: -1 }).limit(10);
    }

    res.json(
      new ApiResponse(200, {
        input: { mood, genre },
        selectedGenre,
        recommendations,
      }, "Recommendations fetched")
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { recommendMovies };
