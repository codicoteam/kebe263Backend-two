const vehicleService = require('../services/vehicle.service');
const vehicleBookingService = require('../services/vehicleBooking.service');
const { success, error } = require('../utils/apiResponse');

const createVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.createVehicle(req.user._id, req.body);
    return success(res, 'Vehicle listed successfully. Pending admin approval.', { vehicle }, 201);
  } catch (err) { next(err); }
};

const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.updateVehicle(req.params.id, req.user._id, req.body);
    return success(res, 'Vehicle updated successfully', { vehicle });
  } catch (err) { next(err); }
};

const deleteVehicle = async (req, res, next) => {
  try {
    await vehicleService.deleteVehicle(req.params.id, req.user._id);
    return success(res, 'Vehicle deleted successfully');
  } catch (err) { next(err); }
};

const getMyVehicles = async (req, res, next) => {
  try {
    const result = await vehicleService.getMyVehicles(req.user._id, req.query);
    return success(res, 'Your vehicles fetched successfully', result);
  } catch (err) { next(err); }
};

const listVehicles = async (req, res, next) => {
  try {
    const result = await vehicleService.listVehicles(req.query);
    return success(res, 'Vehicles fetched successfully', result);
  } catch (err) { next(err); }
};

const getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id);
    return success(res, 'Vehicle fetched successfully', { vehicle });
  } catch (err) { next(err); }
};

const bookVehicle = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.createBooking(req.user._id, req.params.id, req.body);
    return success(res, 'Booking request sent to vehicle owner', { booking }, 201);
  } catch (err) { next(err); }
};

const approveVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.approveVehicle(req.params.id);
    return success(res, 'Vehicle approved successfully', { vehicle });
  } catch (err) { next(err); }
};

const adminGetAllVehicles = async (req, res, next) => {
  try {
    const result = await vehicleService.adminGetAllVehicles(req.query);
    return success(res, 'All vehicles fetched successfully', result);
  } catch (err) { next(err); }
};

const nearbyVehicles = async (req, res, next) => {
  try {
    const result = await vehicleService.nearbyVehicles(req.query);
    return success(res, 'Nearby vehicles fetched successfully', result);
  } catch (err) { next(err); }
};

module.exports = { createVehicle, updateVehicle, deleteVehicle, getMyVehicles, listVehicles, getVehicleById, bookVehicle, approveVehicle, adminGetAllVehicles, nearbyVehicles };
