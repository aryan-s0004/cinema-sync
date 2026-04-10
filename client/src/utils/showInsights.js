const getTimeBand = (value) => {
  const date = new Date(value);
  const hour = date.getHours();

  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "late";
};

const timeBandWeight = (band) => {
  if (band === "afternoon") return 24;
  if (band === "morning") return 20;
  if (band === "evening") return 16;
  return 10;
};

const crowdLabelFromRate = (occupancyRate) => {
  if (occupancyRate <= 0.35) return "Low Crowd";
  if (occupancyRate <= 0.7) return "Medium Crowd";
  return "High Crowd";
};

const scoreReason = ({ occupancyRate, showPrice, minPrice, timeBand }) => {
  if (occupancyRate <= 0.35 && showPrice <= minPrice) {
    return "Lower crowd and lower price than nearby slots.";
  }
  if (occupancyRate <= 0.35) {
    return "Lower crowd window for a relaxed watch.";
  }
  if (showPrice <= minPrice) {
    return "Best value slot for this movie today.";
  }
  if (timeBand === "evening") {
    return "Prime-time slot with a lively audience.";
  }
  return "Balanced choice across price and occupancy.";
};

export const buildSeatStats = (seats = []) => {
  const total = seats.length;
  const available = seats.filter((seat) => seat.status === "available").length;
  const locked = seats.filter((seat) => seat.status === "locked").length;
  const booked = seats.filter((seat) => seat.status === "booked").length;
  const occupancyRate = total ? (locked + booked) / total : 0;

  return {
    total,
    available,
    locked,
    booked,
    occupancyRate,
    occupancyPercent: Math.round(occupancyRate * 100),
    crowdLabel: crowdLabelFromRate(occupancyRate),
  };
};

export const buildShowInsights = (shows = [], statsByShow = {}) => {
  const prices = shows.map((show) => Number(show?.price || 0));
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const priceRange = Math.max(maxPrice - minPrice, 1);

  const insights = shows.map((show) => {
    const showId = String(show?._id || "");
    const seatStats = statsByShow[showId] || null;
    const occupancyRate = seatStats ? seatStats.occupancyRate : 0.5;
    const timeBand = getTimeBand(show?.showTime);
    const priceScore = ((maxPrice - Number(show?.price || 0)) / priceRange) * 35;
    const crowdScore = (1 - occupancyRate) * 45;
    const score = Number((priceScore + crowdScore + timeBandWeight(timeBand)).toFixed(2));

    return {
      showId,
      score,
      timeBand,
      crowdLabel: seatStats?.crowdLabel || crowdLabelFromRate(occupancyRate),
      occupancyPercent: seatStats?.occupancyPercent ?? Math.round(occupancyRate * 100),
      availableSeats: seatStats?.available ?? null,
      reason: scoreReason({
        occupancyRate,
        showPrice: Number(show?.price || 0),
        minPrice,
        timeBand,
      }),
    };
  });

  const best = [...insights].sort((a, b) => b.score - a.score)[0] || null;

  return {
    insights,
    bestShowId: best?.showId || null,
    bestInsight: best,
  };
};

