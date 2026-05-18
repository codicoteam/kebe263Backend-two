const serviceProviderService = require('../services/serviceProvider.service');
const serviceBookingService = require('../services/serviceBooking.service');
const { success } = require('../utils/apiResponse');

const createService = async (req, res, next) => {
  try {
    const service = await serviceProviderService.createService(req.user._id, req.body);
    return success(res, 'Service profile created. Pay deposit to go live.', { service }, 201);
  } catch (err) { next(err); }
};

const updateService = async (req, res, next) => {
  try {
    const service = await serviceProviderService.updateService(req.params.id, req.user._id, req.body);
    return success(res, 'Service updated successfully', { service });
  } catch (err) { next(err); }
};

const deleteService = async (req, res, next) => {
  try {
    await serviceProviderService.deleteService(req.params.id, req.user._id);
    return success(res, 'Service deleted successfully');
  } catch (err) { next(err); }
};

const getMyServices = async (req, res, next) => {
  try {
    const result = await serviceProviderService.getMyServices(req.user._id, req.query);
    return success(res, 'Your services fetched successfully', result);
  } catch (err) { next(err); }
};

const payDeposit = async (req, res, next) => {
  try {
    const result = await serviceProviderService.payDeposit(req.params.id, req.user, req.body);
    return success(res, 'Deposit payment initiated. Your profile goes live once admin approves.', result);
  } catch (err) { next(err); }
};

const listServices = async (req, res, next) => {
  try {
    const result = await serviceProviderService.listServices(req.query);
    return success(res, 'Services fetched successfully', result);
  } catch (err) { next(err); }
};

const nearbyServices = async (req, res, next) => {
  try {
    const result = await serviceProviderService.nearbySearch(req.query);
    return success(res, 'Nearby services fetched successfully', result);
  } catch (err) { next(err); }
};

const getServiceById = async (req, res, next) => {
  try {
    const service = await serviceProviderService.getServiceById(req.params.id, req.query);
    return success(res, 'Service fetched successfully', { service });
  } catch (err) { next(err); }
};

const bookService = async (req, res, next) => {
  try {
    const booking = await serviceBookingService.createBooking(req.user._id, req.params.id, req.body);
    return success(res, 'Booking request sent to service provider', { booking }, 201);
  } catch (err) { next(err); }
};

const depositWebhook = async (req, res, next) => {
  try {
    await serviceProviderService.handleDepositWebhook(req.body);
    return res.status(200).send('OK');
  } catch (err) { next(err); }
};

const approveService = async (req, res, next) => {
  try {
    const service = await serviceProviderService.approveService(req.params.id);
    return success(res, 'Service approved successfully', { service });
  } catch (err) { next(err); }
};

const adminGetAllServices = async (req, res, next) => {
  try {
    const result = await serviceProviderService.adminGetAllServices(req.query);
    return success(res, 'All services fetched successfully', result);
  } catch (err) { next(err); }
};

module.exports = {
  createService, updateService, deleteService, getMyServices, payDeposit,
  listServices, nearbyServices, getServiceById, bookService,
  depositWebhook, approveService, adminGetAllServices,
};
