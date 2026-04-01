const isProduction = process.env.NODE_ENV === "production";

const serializeMeta = (meta = {}) => {
  try {
    return Object.keys(meta).length ? meta : undefined;
  } catch {
    return undefined;
  }
};

const write = (level, message, meta = {}) => {
  const payload = serializeMeta(meta);
  if (payload) {
    console[level](`[CinemaSync] ${message}`, payload);
    return;
  }

  console[level](`[CinemaSync] ${message}`);
};

const logger = {
  info(message, meta) {
    write("log", message, meta);
  },
  warn(message, meta) {
    write("warn", message, meta);
  },
  error(message, meta) {
    write("error", message, meta);
  },
  debug(message, meta) {
    if (!isProduction) {
      write("debug", message, meta);
    }
  },
};

module.exports = logger;
