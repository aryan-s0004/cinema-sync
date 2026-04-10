const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const addMinutes = (date, minutes) => {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
};

export const formatDateTime = (value) => {
  const date = parseDate(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
};

export const formatTime12Hour = (value) => {
  const date = parseDate(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

export const formatTime24Hour = (value) => {
  const date = parseDate(value);
  if (!date) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

export const getShowtimeSegment = (value) => {
  const date = parseDate(value);
  if (!date) return "Show";

  const hour = date.getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  if (hour < 21) return "Evening";
  return "Night";
};

export const formatShowWindow = (startValue, durationMinutes = 150) => {
  const start = parseDate(startValue);
  if (!start) return "-";

  const safeDuration = Math.max(Number(durationMinutes || 0), 60);
  const end = addMinutes(start, safeDuration);
  return `${formatTime12Hour(start)} - ${formatTime12Hour(end)}`;
};

export const formatShowWindow24 = (startValue, durationMinutes = 150) => {
  const start = parseDate(startValue);
  if (!start) return "-";

  const safeDuration = Math.max(Number(durationMinutes || 0), 60);
  const end = addMinutes(start, safeDuration);
  return `${formatTime24Hour(start)} - ${formatTime24Hour(end)}`;
};

export default formatDateTime;
