const User = require('../models/user.model');
const Property = require('../models/property.model');
const PropertyBooking = require('../models/propertyBooking.model');
const Vehicle = require('../models/vehicle.model');
const VehicleBooking = require('../models/vehicleBooking.model');
const ServiceProvider = require('../models/serviceProvider.model');
const ServiceBooking = require('../models/serviceBooking.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');
const PlatformConfig = require('../models/platformConfig.model');
const { invalidateCache } = require('../utils/configCache');

// ─── Platform Config ──────────────────────────────────────────────────────────

const getAllConfig = async () => PlatformConfig.find().populate('updatedBy', 'firstName lastName email').sort({ key: 1 });

const createConfig = async (adminId, { key, value, description }) => {
  if (!key || value == null) throw { status: 400, message: 'key and value are required' };
  const existing = await PlatformConfig.findOne({ key });
  if (existing) throw { status: 409, message: `Config key '${key}' already exists. Use PUT to update.` };
  const config = await PlatformConfig.create({ key, value: String(value), description: description || null, updatedBy: adminId });
  invalidateCache();
  return config;
};

const updateConfig = async (adminId, key, { value, description }) => {
  if (value == null) throw { status: 400, message: 'value is required' };
  const config = await PlatformConfig.findOneAndUpdate(
    { key },
    { value: String(value), ...(description !== undefined && { description }), updatedBy: adminId },
    { new: true, upsert: true }
  );
  invalidateCache();
  return config;
};

// ─── User Management ──────────────────────────────────────────────────────────

const banUser = async (userId) => {
  const user = await User.findById(userId).select('isActive');
  if (!user) throw { status: 404, message: 'User not found' };
  const updated = await User.findByIdAndUpdate(userId, { isActive: !user.isActive }, { new: true });
  return updated.toSafeObject();
};

const verifyUser = async (userId) => {
  const user = await User.findByIdAndUpdate(userId, { isVerified: true }, { new: true });
  if (!user) throw { status: 404, message: 'User not found' };
  return user.toSafeObject();
};

const softDeleteUser = async (userId) => {
  const user = await User.findByIdAndUpdate(userId, { isActive: false, isVerified: false }, { new: true });
  if (!user) throw { status: 404, message: 'User not found' };
  return user.toSafeObject();
};

// ─── Reject operations ────────────────────────────────────────────────────────

const rejectProperty = async (propertyId) => {
  const p = await Property.findByIdAndUpdate(propertyId, { isApproved: false }, { new: true });
  if (!p) throw { status: 404, message: 'Property not found' };
  return p;
};

const rejectVehicle = async (vehicleId) => {
  const v = await Vehicle.findByIdAndUpdate(vehicleId, { isApproved: false }, { new: true });
  if (!v) throw { status: 404, message: 'Vehicle not found' };
  return v;
};

const rejectService = async (serviceId) => {
  const s = await ServiceProvider.findByIdAndUpdate(serviceId, { isApproved: false }, { new: true });
  if (!s) throw { status: 404, message: 'Service not found' };
  return s;
};

const adminDeleteProperty = async (propertyId) => {
  const p = await Property.findByIdAndDelete(propertyId);
  if (!p) throw { status: 404, message: 'Property not found' };
};

const adminDeleteVehicle = async (vehicleId) => {
  const v = await Vehicle.findByIdAndDelete(vehicleId);
  if (!v) throw { status: 404, message: 'Vehicle not found' };
};

const adminDeleteService = async (serviceId) => {
  const s = await ServiceProvider.findByIdAndDelete(serviceId);
  if (!s) throw { status: 404, message: 'Service not found' };
};

// ─── Property bookings ────────────────────────────────────────────────────────

const getAllPropertyBookings = async ({ page = 1, limit = 20, paymentStatus }) => {
  const query = {};
  if (paymentStatus) query.paymentStatus = paymentStatus;
  const skip = (Number(page) - 1) * Number(limit);
  const [bookings, total] = await Promise.all([
    PropertyBooking.find(query).populate('property', 'title type category location').populate('customer', 'firstName lastName email phone').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    PropertyBooking.countDocuments(query),
  ]);
  return { bookings, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

// ─── Wallet: user wallet + transactions ───────────────────────────────────────

const getUserWallet = async (userId, { page = 1, limit = 20 }) => {
  const wallet = await Wallet.findOne({ owner: userId }).populate('owner', 'firstName lastName email');
  if (!wallet) throw { status: 404, message: 'Wallet not found for this user' };
  const skip = (Number(page) - 1) * Number(limit);
  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ wallet: wallet._id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    WalletTransaction.countDocuments({ wallet: wallet._id }),
  ]);
  return { wallet, transactions, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

// ─── Reports ──────────────────────────────────────────────────────────────────

const getOverview = async () => {
  const [
    totalUsers, totalServiceProviders, totalCustomers,
    totalProperties, totalVehicles, totalServices,
    activeVehicleBookings, activeServiceBookings,
    pendingProperties, pendingVehicles, pendingServices,
    accomRev, vehicleRev, serviceRev,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ roles: 'serviceProvider' }),
    User.countDocuments({ roles: 'customer' }),
    Property.countDocuments({ isApproved: true }),
    Vehicle.countDocuments({ isApproved: true }),
    ServiceProvider.countDocuments({ isApproved: true, depositPaid: true }),
    VehicleBooking.countDocuments({ status: { $in: ['accepted', 'inProgress'] } }),
    ServiceBooking.countDocuments({ status: { $in: ['accepted', 'inProgress'] } }),
    Property.countDocuments({ isApproved: false }),
    Vehicle.countDocuments({ isApproved: false }),
    ServiceProvider.countDocuments({ isApproved: false, depositPaid: true }),
    PropertyBooking.aggregate([{ $match: { paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$amountPaid' } } }]),
    VehicleBooking.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$platformFee' } } }]),
    ServiceBooking.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$platformFee' } } }]),
  ]);

  const accommodation = accomRev[0]?.total || 0;
  const vehicle = vehicleRev[0]?.total || 0;
  const service = serviceRev[0]?.total || 0;

  return {
    totalUsers, totalServiceProviders, totalCustomers,
    totalProperties, totalVehicles, totalServices,
    activeBookings: { vehicle: activeVehicleBookings, service: activeServiceBookings },
    totalRevenue: { accommodation, vehicle, service, overall: accommodation + vehicle + service },
    pendingApprovals: { properties: pendingProperties, vehicles: pendingVehicles, services: pendingServices },
  };
};

const buildDateMatch = (startDate, endDate) => {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  return match;
};

const revenueByDay = (model, feeField, extraMatch = {}) =>
  model.aggregate([
    { $match: { ...extraMatch } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: `$${feeField}` }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

const getRevenueReport = async ({ startDate, endDate, module = 'all' }) => {
  const dateMatch = buildDateMatch(startDate, endDate);
  const results = {};

  if (module === 'all' || module === 'accommodation') {
    results.accommodation = await revenueByDay(PropertyBooking, 'amountPaid', { ...dateMatch, paymentStatus: 'paid' });
  }
  if (module === 'all' || module === 'vehicle') {
    results.vehicle = await revenueByDay(VehicleBooking, 'platformFee', { ...dateMatch, status: 'completed' });
  }
  if (module === 'all' || module === 'service') {
    results.service = await revenueByDay(ServiceBooking, 'platformFee', { ...dateMatch, status: 'completed' });
  }

  const totals = {
    accommodation: results.accommodation?.reduce((s, r) => s + r.revenue, 0) ?? null,
    vehicle: results.vehicle?.reduce((s, r) => s + r.revenue, 0) ?? null,
    service: results.service?.reduce((s, r) => s + r.revenue, 0) ?? null,
  };
  totals.overall = Object.values(totals).filter(Boolean).reduce((a, b) => a + b, 0);

  return { byDay: results, totals };
};

const getBookingReport = async ({ startDate, endDate, status, module = 'all' }) => {
  const dateMatch = buildDateMatch(startDate, endDate);
  if (status) dateMatch.status = status;

  const groupByDay = [
    { $match: dateMatch },
    { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, status: '$status' }, count: { $sum: 1 } } },
    { $sort: { '_id.date': 1 } },
  ];

  const results = {};
  if (module === 'all' || module === 'vehicle') results.vehicle = await VehicleBooking.aggregate(groupByDay);
  if (module === 'all' || module === 'service') results.service = await ServiceBooking.aggregate(groupByDay);
  if (module === 'all' || module === 'accommodation') results.accommodation = await PropertyBooking.aggregate(groupByDay);

  return results;
};

const getUserReport = async ({ startDate, endDate }) => {
  const dateMatch = buildDateMatch(startDate, endDate);
  const pipeline = [
    { $match: dateMatch },
    { $group: { _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, roles: '$roles' }, count: { $sum: 1 } } },
    { $sort: { '_id.date': 1 } },
  ];
  const [byDay, total] = await Promise.all([
    User.aggregate(pipeline),
    User.countDocuments(dateMatch),
  ]);
  return { byDay, total };
};

module.exports = {
  getAllConfig, createConfig, updateConfig,
  banUser, verifyUser, softDeleteUser,
  rejectProperty, rejectVehicle, rejectService,
  adminDeleteProperty, adminDeleteVehicle, adminDeleteService,
  getAllPropertyBookings, getUserWallet,
  getOverview, getRevenueReport, getBookingReport, getUserReport,
};
