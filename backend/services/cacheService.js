const cache = new Map();

const now = () => Date.now();

const getCache = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
};

const setCache = (key, value, ttlMs = 30_000) => {
  cache.set(key, {
    value,
    expiresAt: now() + Math.max(ttlMs, 1),
  });
};

const clearCache = (prefix = "") => {
  if (!prefix) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

module.exports = {
  getCache,
  setCache,
  clearCache,
};
