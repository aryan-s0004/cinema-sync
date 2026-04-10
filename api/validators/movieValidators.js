const { isNonEmptyString, parsePagination, safeDate, validateObjectId, parseBoolean } = require("./common");

const movieQueryValidator = (query) => {
  const pagination = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });
  const search = isNonEmptyString(query.search) ? query.search.trim() : "";

  return {
    value: {
      ...query,
      ...pagination,
      search,
    },
  };
};

const movieIdParamValidator = (params) => {
  const idError = validateObjectId("id", params.id);
  if (idError) return { error: idError };
  return { value: params };
};

const movieCreateValidator = (body) => {
  if (!isNonEmptyString(body.title)) {
    return { error: "title is required" };
  }

  const normalized = {
    title: body.title.trim(),
    overview: isNonEmptyString(body.overview) ? body.overview : "",
    language: isNonEmptyString(body.language) ? body.language : "en",
    duration: Number(body.duration || 120),
    releaseDate: body.releaseDate ? safeDate(body.releaseDate) : null,
    rating: Number(body.rating || 0),
    genres: Array.isArray(body.genres) ? body.genres.filter(Boolean) : [],
    posterPath: isNonEmptyString(body.posterPath) ? body.posterPath : "",
    backdropPath: isNonEmptyString(body.backdropPath) ? body.backdropPath : "",
    popularity: Number(body.popularity || 0),
    isActive: parseBoolean(body.isActive, true),
  };

  if (Number.isNaN(normalized.duration) || normalized.duration < 1) {
    return { error: "duration must be a positive number" };
  }

  if (Number.isNaN(normalized.rating) || normalized.rating < 0 || normalized.rating > 10) {
    return { error: "rating must be between 0 and 10" };
  }

  if (Number.isNaN(normalized.popularity) || normalized.popularity < 0) {
    return { error: "popularity must be >= 0" };
  }

  if (body.releaseDate && !normalized.releaseDate) {
    return { error: "releaseDate must be a valid date" };
  }

  return { value: normalized };
};

const movieUpdateValidator = (body) => {
  const updates = {};

  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    if (!isNonEmptyString(body.title)) return { error: "title cannot be empty" };
    updates.title = body.title.trim();
  }

  if (Object.prototype.hasOwnProperty.call(body, "overview")) {
    updates.overview = isNonEmptyString(body.overview) ? body.overview : "";
  }

  if (Object.prototype.hasOwnProperty.call(body, "language")) {
    if (!isNonEmptyString(body.language)) return { error: "language cannot be empty" };
    updates.language = body.language;
  }

  if (Object.prototype.hasOwnProperty.call(body, "duration")) {
    const duration = Number(body.duration);
    if (Number.isNaN(duration) || duration < 1) return { error: "duration must be a positive number" };
    updates.duration = duration;
  }

  if (Object.prototype.hasOwnProperty.call(body, "releaseDate")) {
    if (!body.releaseDate) {
      updates.releaseDate = null;
    } else {
      const releaseDate = safeDate(body.releaseDate);
      if (!releaseDate) return { error: "releaseDate must be a valid date" };
      updates.releaseDate = releaseDate;
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "rating")) {
    const rating = Number(body.rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 10) return { error: "rating must be between 0 and 10" };
    updates.rating = rating;
  }

  if (Object.prototype.hasOwnProperty.call(body, "genres")) {
    if (!Array.isArray(body.genres)) return { error: "genres must be an array" };
    updates.genres = body.genres.filter(Boolean);
  }

  if (Object.prototype.hasOwnProperty.call(body, "posterPath")) {
    updates.posterPath = isNonEmptyString(body.posterPath) ? body.posterPath : "";
  }

  if (Object.prototype.hasOwnProperty.call(body, "backdropPath")) {
    updates.backdropPath = isNonEmptyString(body.backdropPath) ? body.backdropPath : "";
  }

  if (Object.prototype.hasOwnProperty.call(body, "popularity")) {
    const popularity = Number(body.popularity);
    if (Number.isNaN(popularity) || popularity < 0) return { error: "popularity must be >= 0" };
    updates.popularity = popularity;
  }

  if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
    const parsed = parseBoolean(body.isActive);
    if (parsed === null) return { error: "isActive must be true or false" };
    updates.isActive = parsed;
  }

  if (!Object.keys(updates).length) return { error: "At least one valid field is required for update" };
  return { value: updates };
};

module.exports = {
  movieQueryValidator,
  movieIdParamValidator,
  movieCreateValidator,
  movieUpdateValidator,
};
