const { getConfig } = require('./configCache');

// Categories whose rooms field means "N individually-let rooms" (bedsit-style
// rooms, or per-room office/shop space) rather than "bedrooms within one
// house/unit" — mirrors the roomNoun: 'room' categories in the mobile/web
// property_categories taxonomy. These are the only categories priced per room;
// everything else is a single unit, priced flat regardless of room count.
const ROOM_PRICED_CATEGORIES = ['room', 'office', 'shop'];

const RATE_CONFIG_KEYS = {
  high: { room: 'propertyUnlockRoomRateHighDensity', house: 'propertyUnlockHouseRateHighDensity' },
  middle: { room: 'propertyUnlockRoomRateMiddleDensity', house: 'propertyUnlockHouseRateMiddleDensity' },
  low: { room: 'propertyUnlockRoomRateLowDensity', house: 'propertyUnlockHouseRateLowDensity' },
};

const RATE_DEFAULTS = {
  high: { room: 0.25, house: 0.40 },
  middle: { room: 0.50, house: 0.80 },
  low: { room: 0.50, house: 1.00 },
};

/**
 * Computes what a customer pays to unlock a property's full details.
 * - Density-tagged listings: rate × room count (room-priced categories) or a
 *   flat per-unit rate (house-priced categories), both admin-configurable.
 * - Untagged listings (density never set, e.g. pre-existing data) fall back
 *   to the old flat global unlockFee so nothing already live breaks.
 */
const getPropertyUnlockFee = async (property) => {
  if (!property.density || !RATE_CONFIG_KEYS[property.density]) {
    return Number(await getConfig('unlockFee', process.env.UNLOCK_FEE || '1'));
  }

  const keys = RATE_CONFIG_KEYS[property.density];
  const defaults = RATE_DEFAULTS[property.density];
  const isRoomPriced = ROOM_PRICED_CATEGORIES.includes(property.category);

  if (isRoomPriced) {
    const roomRate = Number(await getConfig(keys.room, String(defaults.room)));
    const rooms = Number(property.rooms) > 0 ? Number(property.rooms) : 1;
    return Number((roomRate * rooms).toFixed(2));
  }

  const houseRate = Number(await getConfig(keys.house, String(defaults.house)));
  return Number(houseRate.toFixed(2));
};

module.exports = { getPropertyUnlockFee, ROOM_PRICED_CATEGORIES, RATE_CONFIG_KEYS, RATE_DEFAULTS };
