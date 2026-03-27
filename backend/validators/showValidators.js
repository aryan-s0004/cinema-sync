const { isNonEmptyString, parsePagination, safeDate, validateObjectId } = require("./common");

const showListQueryValidator = (query) => {
  const pagination = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });

  if (query.movieId) {
    const movieIdErr = validateObjectId("movieId", query.movieId);
    if (movieIdErr) return { error: movieIdErr };
  }

  if (query.date) {
    const date = safeDate(query.date);
    if (!date) return { error: "date must be a valid date" };
  }

  return {
    value: {
      ...query,
      ...pagination,
    },
  };
};

const showIdParamValidator = (params) => {
  const error = validateObjectId("id", params.id);
  if (error) return { error };
  return { value: params };
};

const showCreateValidator = (body) => {
  const movieErr = validateObjectId("movie", body.movie);
  if (movieErr) return { error: movieErr };

  if (!isNonEmptyString(body.theatreName)) {
    return { error: "theatreName is required" };
  }

  const parsedShowTime = safeDate(body.showTime);
  if (!parsedShowTime) {
    return { error: "showTime must be a valid date" };
  }

  const price = Number(body.price);
  const totalSeats = Number(body.totalSeats);

  if (Number.isNaN(price) || price <= 0) {
    return { error: "price must be greater than 0" };
  }

  if (Number.isNaN(totalSeats) || totalSeats < 1 || totalSeats > 500) {
    return { error: "totalSeats must be between 1 and 500" };
  }

  return {
    value: {
      movie: body.movie,
      theatreName: body.theatreName.trim(),
      screenName: isNonEmptyString(body.screenName) ? body.screenName.trim() : "Screen 1",
      showTime: parsedShowTime,
      price,
      totalSeats,
    },
  };
};

module.exports = {
  showListQueryValidator,
  showIdParamValidator,
  showCreateValidator,
};
