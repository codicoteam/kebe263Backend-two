const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cache = {};
let lastRefreshed = 0;

const refreshCache = async () => {
  try {
    const PlatformConfig = require('../models/platformConfig.model');
    const configs = await PlatformConfig.find();
    cache = {};
    for (const c of configs) {
      cache[c.key] = c.value;
    }
    lastRefreshed = Date.now();
  } catch (err) {
    console.error('[ConfigCache] Refresh failed:', err.message);
  }
};

const getConfig = async (key, defaultValue = null) => {
  if (Date.now() - lastRefreshed > CACHE_TTL) {
    await refreshCache();
  }
  return key in cache ? cache[key] : defaultValue;
};

const invalidateCache = () => {
  lastRefreshed = 0;
};

module.exports = { getConfig, refreshCache, invalidateCache };
