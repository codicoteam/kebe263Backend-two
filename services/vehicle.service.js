const Vehicle = require('../models/vehicle.model');

const createVehicle = async (ownerId, data) => {
  const { make, model, year, color, plateNumber, type, pricePerKm, currency, images } = data;
  if (!make || !model || !year || !color || !plateNumber || !type || !pricePerKm) {
    throw { status: 400, message: 'make, model, year, color, plateNumber, type, and pricePerKm are required' };
  }
  const existing = await Vehicle.findOne({ owner: ownerId });
  if (existing) throw { status: 409, message: 'You already have a vehicle listed. Edit it instead of creating a new one.' };
  return Vehicle.create({
    owner: ownerId,
    make,
    model,
    year,
    color,
    plateNumber,
    type,
    pricePerKm,
    currency: currency || 'USD',
    images: images || [],
  });
};

const updateVehicle = async (vehicleId, ownerId, data) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw { status: 404, message: 'Vehicle not found' };
  if (vehicle.owner.toString() !== ownerId.toString()) {
    throw { status: 403, message: 'You can only edit your own vehicles' };
  }

  const allowed = ['make', 'model', 'year', 'color', 'plateNumber', 'type', 'pricePerKm', 'currency', 'images', 'isAvailable'];
  for (const key of allowed) {
    if (data[key] !== undefined) vehicle[key] = data[key];
  }

  const coreChanged = ['make', 'model', 'plateNumber', 'year'].some((k) => data[k] !== undefined);
  if (coreChanged) vehicle.isApproved = false;

  await vehicle.save();
  return vehicle;
};

const deleteVehicle = async (vehicleId, ownerId) => {
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw { status: 404, message: 'Vehicle not found' };
  if (vehicle.owner.toString() !== ownerId.toString()) {
    throw { status: 403, message: 'You can only delete your own vehicles' };
  }
  await vehicle.deleteOne();
};

const getMyVehicles = async (ownerId, { page = 1, limit = 20 }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const [vehicles, total] = await Promise.all([
    Vehicle.find({ owner: ownerId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Vehicle.countDocuments({ owner: ownerId }),
  ]);
  return { vehicles, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const listVehicles = async ({ page = 1, limit = 20, type, city }) => {
  const query = { isApproved: true, isAvailable: true };
  if (type) query.type = type;
  // city not stored on vehicle model — filter via owner city if needed in future
  const skip = (Number(page) - 1) * Number(limit);
  const [vehicles, total] = await Promise.all([
    Vehicle.find(query).populate('owner', 'firstName lastName phone').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Vehicle.countDocuments(query),
  ]);
  return { vehicles, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const getVehicleById = async (vehicleId) => {
  const vehicle = await Vehicle.findById(vehicleId).populate('owner', 'firstName lastName phone');
  if (!vehicle || !vehicle.isApproved) throw { status: 404, message: 'Vehicle not found' };
  return vehicle;
};

const approveVehicle = async (vehicleId) => {
  const vehicle = await Vehicle.findByIdAndUpdate(vehicleId, { isApproved: true }, { new: true });
  if (!vehicle) throw { status: 404, message: 'Vehicle not found' };
  return vehicle;
};

const adminGetAllVehicles = async ({ page = 1, limit = 20, isApproved, type }) => {
  const query = {};
  if (isApproved !== undefined) query.isApproved = isApproved === 'true';
  if (type) query.type = type;
  const skip = (Number(page) - 1) * Number(limit);
  const [vehicles, total] = await Promise.all([
    Vehicle.find(query).populate('owner', 'firstName lastName email phone').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Vehicle.countDocuments(query),
  ]);
  return { vehicles, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const nearbyVehicles = async ({ lat, lng, radius = 10, type, page = 1, limit = 20 }) => {
  if (!lat || !lng) throw { status: 400, message: 'lat and lng query parameters are required' };

  const radiusMeters = Number(radius) * 1000;
  const skip = (Number(page) - 1) * Number(limit);
  const matchQuery = { isApproved: true, isAvailable: true };
  if (type) matchQuery.type = type;

  const geoNearStage = {
    $geoNear: {
      near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
      distanceField: 'distanceMeters',
      maxDistance: radiusMeters,
      spherical: true,
      query: matchQuery,
    },
  };

  const [results, countResult] = await Promise.all([
    Vehicle.aggregate([geoNearStage, { $skip: skip }, { $limit: Number(limit) }]),
    Vehicle.aggregate([geoNearStage, { $count: 'total' }]),
  ]);

  const total = countResult[0]?.total || 0;
  const vehicles = results.map((doc) => ({
    ...doc,
    distanceKm: Number((doc.distanceMeters / 1000).toFixed(2)),
  }));

  return { vehicles, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

module.exports = { createVehicle, updateVehicle, deleteVehicle, getMyVehicles, listVehicles, getVehicleById, approveVehicle, adminGetAllVehicles, nearbyVehicles };
