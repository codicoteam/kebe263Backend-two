const Property = require('../models/property.model');
const Vehicle = require('../models/vehicle.model');
const ServiceProvider = require('../models/serviceProvider.model');

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
};

const addDistance = (docs, lat, lng, coordsPath) =>
  docs.map((doc) => {
    const obj = doc.toObject ? doc.toObject() : doc;
    const coords = coordsPath.split('.').reduce((o, k) => o?.[k], obj);
    if (lat && lng && coords?.length === 2) {
      obj.distanceKm = haversineKm(Number(lat), Number(lng), coords[1], coords[0]);
    }
    return obj;
  });

const globalSearch = async ({ q, type = 'all', lat, lng, limit = 10 }) => {
  if (!q || q.trim().length < 2) throw { status: 400, message: 'Search query q must be at least 2 characters' };

  const regex = { $regex: q.trim(), $options: 'i' };
  const lim = Math.min(Number(limit) || 10, 50);
  const results = {};

  if (type === 'all' || type === 'property') {
    const docs = await Property.find({
      isApproved: true, isAvailable: true,
      $or: [{ title: regex }, { description: regex }, { 'location.city': regex }],
    })
      .select('title description type category purpose price currency rooms images location isAvailable')
      .limit(lim);

    results.properties = lat && lng
      ? addDistance(docs, lat, lng, 'location.coordinates').sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      : docs.map((d) => d.toObject());
  }

  if (type === 'all' || type === 'vehicle') {
    const docs = await Vehicle.find({
      isApproved: true, isAvailable: true,
      $or: [{ make: regex }, { model: regex }, { color: regex }, { type: regex }],
    })
      .select('make model year color type pricePerKm currency images currentLocation')
      .populate('owner', 'firstName lastName phone')
      .limit(lim);

    results.vehicles = lat && lng
      ? addDistance(docs, lat, lng, 'currentLocation.coordinates').sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      : docs.map((d) => d.toObject());
  }

  if (type === 'all' || type === 'service') {
    const docs = await ServiceProvider.find({
      isApproved: true, isAvailable: true, depositPaid: true,
      $or: [{ businessName: regex }, { description: regex }, { category: regex }, { 'location.city': regex }],
    })
      .select('businessName category description estimatedPrice currency priceUnit rating totalReviews profileImage location')
      .populate('owner', 'firstName lastName phone')
      .limit(lim);

    results.services = lat && lng
      ? addDistance(docs, lat, lng, 'location.coordinates').sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      : docs.map((d) => d.toObject());
  }

  return results;
};

module.exports = { globalSearch };
