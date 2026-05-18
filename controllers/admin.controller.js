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
  try { return success(res, 'User deactivated', { user: await adminService.softDeleteUser(req.params.id) }); }
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
  getConfig, createConfig, updateConfig,
  getUsers, getUser, banUser, verifyUser, deleteUser,
  getProperties, approveProperty, rejectProperty, deleteProperty, getPropertyBookings,
  getVehicles, approveVehicle, rejectVehicle, deleteVehicle, getVehicleBookings, getWallets, getUserWallet,
  getServices, approveService, rejectService, deleteService, getServiceBookings,
  getOverview, getRevenueReport, getBookingReport, getUserReport,
  adminGetChatRooms,
};
