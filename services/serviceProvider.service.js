const { Paynow } = require('paynow');
const ServiceProvider = require('../models/serviceProvider.model');
const AppConfig = require('../models/appConfig.model');

const getPaynow = () =>
  new Paynow(
    process.env.PAYNOW_ID,
    process.env.PAYNOW_KEY,
    process.env.PAYNOW_SERVICE_DEPOSIT_RESULT_URL || process.env.PAYNOW_RESULT_URL,
    process.env.PAYNOW_RETURN_URL
  );

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
};

// ─── Service Provider CRUD ────────────────────────────────────────────────────

const createService = async (ownerId, data) => {
  const { businessName, category, description, estimatedPrice, currency, priceUnit, location, profileImage, portfolioImages } = data;
  if (!businessName || !category || !description || estimatedPrice == null) {
    throw { status: 400, message: 'businessName, category, description, and estimatedPrice are required' };
  }

  const loc = location || {};
  if (loc.lng && loc.lat) {
    loc.type = 'Point';
    loc.coordinates = [Number(loc.lng), Number(loc.lat)];
  }

  return ServiceProvider.create({
    owner: ownerId,
    businessName,
    category,
    description,
    estimatedPrice,
    currency: currency || 'USD',
    priceUnit: priceUnit || 'perJob',
    location: loc,
    profileImage: profileImage || null,
    portfolioImages: portfolioImages || [],
  });
};

const updateService = async (serviceId, ownerId, data) => {
  const service = await ServiceProvider.findById(serviceId);
  if (!service) throw { status: 404, message: 'Service not found' };
  if (service.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'You can only edit your own services' };

  const allowed = ['businessName', 'category', 'description', 'estimatedPrice', 'currency', 'priceUnit', 'profileImage', 'portfolioImages', 'isAvailable'];
  for (const key of allowed) {
    if (data[key] !== undefined) service[key] = data[key];
  }

  if (data.location) {
    const loc = data.location;
    if (loc.lng && loc.lat) {
      loc.type = 'Point';
      loc.coordinates = [Number(loc.lng), Number(loc.lat)];
    }
    service.location = { ...service.location.toObject?.() ?? service.location, ...loc };
  }

  const coreChanged = ['businessName', 'category', 'description'].some((k) => data[k] !== undefined);
  if (coreChanged) service.isApproved = false;

  await service.save();
  return service;
};

const deleteService = async (serviceId, ownerId) => {
  const service = await ServiceProvider.findById(serviceId);
  if (!service) throw { status: 404, message: 'Service not found' };
  if (service.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'You can only delete your own services' };
  await service.deleteOne();
};

const getMyServices = async (ownerId, { page = 1, limit = 20 }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const [services, total] = await Promise.all([
    ServiceProvider.find({ owner: ownerId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    ServiceProvider.countDocuments({ owner: ownerId }),
  ]);
  return { services, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

// ─── Browse & Search ──────────────────────────────────────────────────────────

const listServices = async ({ page = 1, limit = 20, category, city, currency }) => {
  const query = { isApproved: true, isAvailable: true, depositPaid: true };
  if (category) query.category = category;
  if (city) query['location.city'] = { $regex: city, $options: 'i' };
  if (currency) query.currency = currency;

  const skip = (Number(page) - 1) * Number(limit);
  const [services, total] = await Promise.all([
    ServiceProvider.find(query).populate('owner', 'firstName lastName phone').sort({ rating: -1, createdAt: -1 }).skip(skip).limit(Number(limit)),
    ServiceProvider.countDocuments(query),
  ]);
  return { services, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const nearbySearch = async ({ lat, lng, radius = 10, category, page = 1, limit = 20 }) => {
  if (!lat || !lng) throw { status: 400, message: 'lat and lng query parameters are required' };

  const radiusMeters = Number(radius) * 1000;
  const skip = (Number(page) - 1) * Number(limit);

  const matchQuery = { isApproved: true, isAvailable: true, depositPaid: true };
  if (category) matchQuery.category = category;

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
    ServiceProvider.aggregate([
      geoNearStage,
      { $lookup: { from: 'users', localField: 'owner', foreignField: '_id', as: 'owner' } },
      { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
      { $addFields: { 'owner': { firstName: '$owner.firstName', lastName: '$owner.lastName', phone: '$owner.phone' } } },
      { $skip: skip },
      { $limit: Number(limit) },
    ]),
    ServiceProvider.aggregate([geoNearStage, { $count: 'total' }]),
  ]);

  const total = countResult[0]?.total || 0;
  const services = results.map((doc) => ({
    ...doc,
    distanceKm: Number((doc.distanceMeters / 1000).toFixed(2)),
  }));

  return { services, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const getServiceById = async (serviceId, { lat, lng } = {}) => {
  const service = await ServiceProvider.findById(serviceId).populate('owner', 'firstName lastName phone email');
  if (!service || !service.isApproved || !service.depositPaid) throw { status: 404, message: 'Service not found' };

  const obj = service.toObject();
  if (lat && lng && obj.location?.coordinates?.length === 2) {
    obj.distanceKm = haversineKm(Number(lat), Number(lng), obj.location.coordinates[1], obj.location.coordinates[0]);
  }
  return obj;
};

// ─── Deposit ──────────────────────────────────────────────────────────────────

const payDeposit = async (serviceId, owner, { phone, method = 'ecocash' }) => {
  const service = await ServiceProvider.findById(serviceId);
  if (!service) throw { status: 404, message: 'Service not found' };
  if (service.owner.toString() !== owner._id.toString()) throw { status: 403, message: 'Not your service' };
  if (service.depositPaid) throw { status: 400, message: 'Deposit already paid' };

  const DEPOSIT_FEE = Number(await getConfig('serviceDepositFee', process.env.SERVICE_DEPOSIT_FEE || '5'));
  const reference = `DEPOSIT-${serviceId}-${owner._id}-${Date.now()}`;

  const paynow = getPaynow();
  const payment = paynow.createPayment(reference, process.env.PAYNOW_MERCHANT_EMAIL);
  payment.add(`Service deposit: ${service.businessName}`, DEPOSIT_FEE);

  service.depositReference = reference;
  service.depositAmount = DEPOSIT_FEE;
  await service.save();

  let resp;
  try {
    resp = phone ? await paynow.sendMobile(payment, phone, method) : await paynow.send(payment);
  } catch {
    throw { status: 502, message: 'Could not reach payment gateway. Please try again.' };
  }

  if (!resp || !resp.success) {
    throw { status: 502, message: resp?.error || 'Payment initiation failed. Please try again.' };
  }

  return {
    reference,
    pollUrl: resp.pollUrl || null,
    redirectUrl: resp.redirectUrl || null,
    instructions: resp.instructions || null,
    amount: DEPOSIT_FEE,
    currency: 'USD',
  };
};

const handleDepositWebhook = async (rawBody) => {
  const paynow = getPaynow();
  const isValid = paynow.verifyHash(rawBody);
  if (!isValid) throw { status: 400, message: 'Invalid PayNow signature' };

  const { reference, status } = rawBody;
  if (!reference || !status) return;

  const service = await ServiceProvider.findOne({ depositReference: reference });
  if (!service || service.depositPaid) return;

  if (status.toLowerCase() === 'paid') {
    service.depositPaid = true;
    await service.save();
    notify(service.owner, 'Deposit Received', `Your deposit for "${service.businessName}" has been received. Pending admin approval.`, 'deposit');
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

const approveService = async (serviceId) => {
  const service = await ServiceProvider.findByIdAndUpdate(serviceId, { isApproved: true }, { new: true });
  if (!service) throw { status: 404, message: 'Service not found' };
  return service;
};

const adminGetAllServices = async ({ page = 1, limit = 20, isApproved, category, depositPaid }) => {
  const query = {};
  if (isApproved !== undefined) query.isApproved = isApproved === 'true';
  if (depositPaid !== undefined) query.depositPaid = depositPaid === 'true';
  if (category) query.category = category;

  const skip = (Number(page) - 1) * Number(limit);
  const [services, total] = await Promise.all([
    ServiceProvider.find(query).populate('owner', 'firstName lastName email phone').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    ServiceProvider.countDocuments(query),
  ]);
  return { services, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

module.exports = {
  createService, updateService, deleteService, getMyServices,
  listServices, nearbySearch, getServiceById,
  payDeposit, handleDepositWebhook,
  approveService, adminGetAllServices,
};
