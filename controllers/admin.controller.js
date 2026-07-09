const adminService = require('../services/admin.service');
const chatService = require('../services/chat.service');
const userService = require('../services/user.service');
const propertyService = require('../services/property.service');
const vehicleService = require('../services/vehicle.service');
const vehicleBookingService = require('../services/vehicleBooking.service');
const serviceProviderService = require('../services/serviceProvider.service');
const serviceBookingService = require('../services/serviceBooking.service');
const walletService = require('../services/wallet.service');
const notify = require('../utils/notify');
const { success } = require('../utils/apiResponse');

// ─── Pricing Rules ────────────────────────────────────────────────────────────

const PRICING_KEYS = [
  'platformFeePercent',
  'vehiclePlatformFeePercent',
  'servicePlatformFeePercent',
  'serviceProviderDepositAmount',
  'vehicleOwnerDepositAmount',
  'minBookingAmountVehicle',
  'minBookingAmountService',
];

const getPricingRules = async (req, res, next) => {
  try {
    const all = await adminService.getAllConfig();
    const pricing = all.filter((c) => PRICING_KEYS.includes(c.key));
    return success(res, 'Pricing rules fetched', { pricing });
  } catch (err) { next(err); }
};

const updatePricingRule = async (req, res, next) => {
  try {
    const { key } = req.params;
    if (!PRICING_KEYS.includes(key)) {
      return next({ status: 400, message: `Unknown pricing key: ${key}. Allowed: ${PRICING_KEYS.join(', ')}` });
    }
    const config = await adminService.updateConfig(req.user._id, key, req.body);
    return success(res, `Pricing rule "${key}" updated`, { config });
  } catch (err) { next(err); }
};

// ─── Platform Config ──────────────────────────────────────────────────────────

const getConfig = async (req, res, next) => {
  try { return success(res, 'Config fetched', { config: await adminService.getAllConfig() }); }
  catch (err) { next(err); }
};

const createConfig = async (req, res, next) => {
  try { return success(res, 'Config created', { config: await adminService.createConfig(req.user._id, req.body) }, 201); }
  catch (err) { next(err); }
};

const updateConfig = async (req, res, next) => {
  try { return success(res, 'Config updated', { config: await adminService.updateConfig(req.user._id, req.params.key, req.body) }); }
  catch (err) { next(err); }
};

const getCategories = async (req, res, next) => {
  try { return success(res, 'Categories fetched', await adminService.getCategories()); }
  catch (err) { next(err); }
};

const addCategory = async (req, res, next) => {
  try {
    const { entity, value, description } = req.body;
    return success(res, 'Category added', await adminService.addCategory(req.user._id, entity, value, description), 201);
  } catch (err) { next(err); }
};

const removeCategory = async (req, res, next) => {
  try { return success(res, 'Category removed', await adminService.removeCategory(req.user._id, req.params.entity, req.params.value)); }
  catch (err) { next(err); }
};

const broadcastNotifications = async (req, res, next) => {
  try {
    const { title, message, type, role } = req.body;
    return success(res, 'Notifications sent', await adminService.broadcastNotification(title, message, type, role));
  } catch (err) { next(err); }
};

const updateKycStatus = async (req, res, next) => {
  try { return success(res, 'KYC status updated', { user: await adminService.updateKycStatus(req.user._id, req.params.id, req.body) }); }
  catch (err) { next(err); }
};

const processRefund = async (req, res, next) => {
  try {
    const result = await adminService.refundBooking(req.user._id, { bookingType: req.body.bookingType, bookingId: req.params.id, amount: req.body.amount, reason: req.body.reason });
    return success(res, 'Refund processed', result);
  } catch (err) { next(err); }
};

const getAdminLocations = async (req, res, next) => {
  try { return success(res, 'Admin locations fetched', await adminService.getAdminLocations()); }
  catch (err) { next(err); }
};

// ─── Users ────────────────────────────────────────────────────────────────────

const getUsers = async (req, res, next) => {
  try { return success(res, 'Users fetched', await userService.getAllUsers(req.query)); }
  catch (err) { next(err); }
};

const getUser = async (req, res, next) => {
  try { return success(res, 'User fetched', { user: await userService.getUserById(req.params.id) }); }
  catch (err) { next(err); }
};

const banUser = async (req, res, next) => {
  try {
    const user = await adminService.banUser(req.params.id);
    return success(res, user.isActive ? 'User unbanned' : 'User banned', { user });
  } catch (err) { next(err); }
};

const verifyUser = async (req, res, next) => {
  try { return success(res, 'User verified', { user: await adminService.verifyUser(req.params.id) }); }
  catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try { return success(res, 'User permanently deleted', await adminService.hardDeleteUser(req.params.id)); }
  catch (err) { next(err); }
};

// ─── Properties ───────────────────────────────────────────────────────────────

const getProperties = async (req, res, next) => {
  try { return success(res, 'Properties fetched', await propertyService.adminGetAllProperties(req.query)); }
  catch (err) { next(err); }
};

const approveProperty = async (req, res, next) => {
  try {
    const property = await propertyService.approveProperty(req.params.id);
    notify(property.owner, 'Listing Approved', `Your property "${property.title}" has been approved and is now live.`, 'approval');
    return success(res, 'Property approved', { property });
  } catch (err) { next(err); }
};

const rejectProperty = async (req, res, next) => {
  try {
    const property = await adminService.rejectProperty(req.params.id);
    notify(property.owner, 'Listing Rejected', `Your property "${property.title}" was not approved. Please review and resubmit.`, 'approval');
    return success(res, 'Property rejected', { property });
  } catch (err) { next(err); }
};

const deleteProperty = async (req, res, next) => {
  try { await adminService.adminDeleteProperty(req.params.id); return success(res, 'Property deleted'); }
  catch (err) { next(err); }
};

const getPropertyBookings = async (req, res, next) => {
  try { return success(res, 'Property bookings fetched', await adminService.getAllPropertyBookings(req.query)); }
  catch (err) { next(err); }
};

// ─── Vehicles ─────────────────────────────────────────────────────────────────

const getVehicles = async (req, res, next) => {
  try { return success(res, 'Vehicles fetched', await vehicleService.adminGetAllVehicles(req.query)); }
  catch (err) { next(err); }
};

const approveVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.approveVehicle(req.params.id);
    notify(vehicle.owner, 'Vehicle Approved', `Your ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber}) is now live.`, 'approval');
    return success(res, 'Vehicle approved', { vehicle });
  } catch (err) { next(err); }
};

const rejectVehicle = async (req, res, next) => {
  try {
    const vehicle = await adminService.rejectVehicle(req.params.id);
    notify(vehicle.owner, 'Vehicle Rejected', `Your ${vehicle.make} ${vehicle.model} was not approved.`, 'approval');
    return success(res, 'Vehicle rejected', { vehicle });
  } catch (err) { next(err); }
};

const deleteVehicle = async (req, res, next) => {
  try { await adminService.adminDeleteVehicle(req.params.id); return success(res, 'Vehicle deleted'); }
  catch (err) { next(err); }
};

const disableVehicle = async (req, res, next) => {
  try {
    const vehicle = await adminService.disableVehicle(req.params.id);
    notify(vehicle.owner, 'Vehicle Disabled', `Your ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber}) has been disabled by an admin and is no longer visible to customers.`, 'approval');
    return success(res, 'Vehicle disabled', { vehicle });
  } catch (err) { next(err); }
};

const enableVehicle = async (req, res, next) => {
  try {
    const vehicle = await adminService.enableVehicle(req.params.id);
    notify(vehicle.owner, 'Vehicle Re-enabled', `Your ${vehicle.make} ${vehicle.model} (${vehicle.plateNumber}) is visible to customers again.`, 'approval');
    return success(res, 'Vehicle enabled', { vehicle });
  } catch (err) { next(err); }
};

const getVehicleBookings = async (req, res, next) => {
  try { return success(res, 'Vehicle bookings fetched', await vehicleBookingService.adminGetAllBookings(req.query)); }
  catch (err) { next(err); }
};

const getWallets = async (req, res, next) => {
  try { return success(res, 'Wallets fetched', await walletService.adminGetAllWallets(req.query)); }
  catch (err) { next(err); }
};

const getUserWallet = async (req, res, next) => {
  try { return success(res, 'User wallet fetched', await adminService.getUserWallet(req.params.userId, req.query)); }
  catch (err) { next(err); }
};

// ─── Services ─────────────────────────────────────────────────────────────────

const getServices = async (req, res, next) => {
  try { return success(res, 'Services fetched', await serviceProviderService.adminGetAllServices(req.query)); }
  catch (err) { next(err); }
};

const approveService = async (req, res, next) => {
  try {
    const service = await serviceProviderService.approveService(req.params.id);
    notify(service.owner, 'Service Approved', `Your service "${service.businessName}" is now live.`, 'approval');
    return success(res, 'Service approved', { service });
  } catch (err) { next(err); }
};

const rejectService = async (req, res, next) => {
  try {
    const service = await adminService.rejectService(req.params.id);
    notify(service.owner, 'Service Rejected', `Your service "${service.businessName}" was not approved.`, 'approval');
    return success(res, 'Service rejected', { service });
  } catch (err) { next(err); }
};

const deleteService = async (req, res, next) => {
  try { await adminService.adminDeleteService(req.params.id); return success(res, 'Service deleted'); }
  catch (err) { next(err); }
};

const getServiceBookings = async (req, res, next) => {
  try { return success(res, 'Service bookings fetched', await serviceBookingService.adminGetAllBookings(req.query)); }
  catch (err) { next(err); }
};

// ─── Reports ──────────────────────────────────────────────────────────────────

const getOverview = async (req, res, next) => {
  try { return success(res, 'Overview fetched', await adminService.getOverview()); }
  catch (err) { next(err); }
};

const getRevenueReport = async (req, res, next) => {
  try { return success(res, 'Revenue report fetched', await adminService.getRevenueReport(req.query)); }
  catch (err) { next(err); }
};

const getBookingReport = async (req, res, next) => {
  try { return success(res, 'Booking report fetched', await adminService.getBookingReport(req.query)); }
  catch (err) { next(err); }
};

const getUserReport = async (req, res, next) => {
  try { return success(res, 'User report fetched', await adminService.getUserReport(req.query)); }
  catch (err) { next(err); }
};

const adminGetChatRooms = async (req, res, next) => {
  try {
    const result = await chatService.adminGetAllRooms(req.query);
    return success(res, 'Chat rooms fetched', result);
  } catch (err) { next(err); }
};

module.exports = {
  getPricingRules, updatePricingRule,
  getConfig, createConfig, updateConfig,
  getCategories, addCategory, removeCategory,
  broadcastNotifications, updateKycStatus, processRefund, getAdminLocations,
  getUsers, getUser, banUser, verifyUser, deleteUser,
  getProperties, approveProperty, rejectProperty, deleteProperty, getPropertyBookings,
  getVehicles, approveVehicle, rejectVehicle, deleteVehicle, disableVehicle, enableVehicle, getVehicleBookings, getWallets, getUserWallet,
  getServices, approveService, rejectService, deleteService, getServiceBookings,
  getOverview, getRevenueReport, getBookingReport, getUserReport,
  adminGetChatRooms,
};
