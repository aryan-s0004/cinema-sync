const cache = new Map();
const MAX_CACHE_KEYS = Math.max(Number(process.env.CACHE_MAX_KEYS || 500), 50);

const now = () => Date.now();

const pruneExpired = () => {
  const current = now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= current) {
      cache.delete(key);
    }
  }
};

const enforceLimit = () => {
  if (cache.size <= MAX_CACHE_KEYS) return;
  const overflow = cache.size - MAX_CACHE_KEYS;
  const keys = cache.keys();
  for (let i = 0; i < overflow; i += 1) {
    const next = keys.next();
    if (next.done) break;
    cache.delete(next.value);
  }
};

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
  pruneExpired();
  cache.set(key, {
    value,
    expiresAt: now() + Math.max(ttlMs, 1),
  });
  enforceLimit();
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
