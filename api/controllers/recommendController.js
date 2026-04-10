const Movie = require("../models/Movie");
const Booking = require("../models/Booking");
const ApiResponse = require("../utils/ApiResponse");
const { getCache, setCache } = require("../services/cacheService");
const movieProviderConfig = require("../config/movieProvider");
const { ensureMovieCatalog } = require("../services/movieProviderService");

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

const inferGenreFromHistory = async (userId) => {
  if (!userId) return null;

  const recentBookings = await Booking.find({ user: userId, status: "confirmed" })
    .populate({ path: "show", populate: { path: "movie", select: "genres" } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const genreCount = new Map();
  for (const booking of recentBookings) {
    const genres = booking?.show?.movie?.genres || [];
    for (const genre of genres) {
      const key = String(genre || "").trim();
      if (!key) continue;
      genreCount.set(key, (genreCount.get(key) || 0) + 1);
    }
  }

  const sorted = [...genreCount.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
};

const recommendMovies = async (req, res, next) => {
  try {
    const { mood, genre } = req.body || {};
    const userId = req.user?._id ? String(req.user._id) : "guest";
    const cacheKey = `recommend:${userId}:${String(mood || "").toLowerCase()}:${String(genre || "").toLowerCase()}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return res.json(new ApiResponse(200, cached, "Recommendations fetched (cached)"));
    }

    const historyGenre = await inferGenreFromHistory(req.user?._id);

    let aiGenre = null;
    try {
      aiGenre = await callOpenAIForGenre({ mood, genre });
    } catch (_err) {
      aiGenre = null;
    }
    const selectedGenre = String(
      aiGenre || genre || moodToGenre[(mood || "").toLowerCase()] || historyGenre || "Action"
    ).trim();

    await ensureMovieCatalog({ minimumCount: 12, pages: 2, perPage: 20 });

    let recommendations = await Movie.find({
      isActive: true,
      ...(selectedGenre
        ? {
            $or: [
              { genres: { $in: [selectedGenre] } },
              { title: { $regex: selectedGenre, $options: "i" } },
            ],
          }
        : {}),
    })
      .sort({ rating: -1, popularity: -1, createdAt: -1 })
      .limit(10)
      .lean();

    if (!recommendations.length) {
      recommendations = await Movie.find({ isActive: true })
        .sort({ rating: -1, popularity: -1, createdAt: -1 })
        .limit(10)
        .lean();
    }

    const payload = {
      input: { mood, genre, userId: req.user?._id || null },
      selectedGenre,
      reason: historyGenre
        ? `Personalized using your recent booking preferences (${historyGenre})`
        : `Based on ${movieProviderConfig.provider} catalog and selected genre`,
      recommendations,
    };

    setCache(cacheKey, payload, 60_000);
    res.json(new ApiResponse(200, payload, "Recommendations fetched"));
  } catch (error) {
    next(error);
  }
};

module.exports = { recommendMovies };
