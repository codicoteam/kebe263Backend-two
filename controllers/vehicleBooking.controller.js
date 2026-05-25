const vehicleBookingService = require('../services/vehicleBooking.service');
const { success } = require('../utils/apiResponse');

const acceptBooking = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.acceptBooking(req.params.id, req.user._id);
    return success(res, 'Booking accepted', { booking });
  } catch (err) { next(err); }
};

const startRide = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.startRide(req.params.id, req.user._id);
    return success(res, 'Ride started', { booking });
  } catch (err) { next(err); }
};

const completeBooking = async (req, res, next) => {
  try {
    const result = await vehicleBookingService.completeBooking(req.params.id, req.user._id);
    return success(res, `Ride completed. Platform fee: $${result.platformFee}. Your earnings: $${result.ownerEarnings}`, result);
  } catch (err) { next(err); }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.cancelBooking(req.params.id, req.user._id);
    return success(res, 'Booking cancelled', { booking });
  } catch (err) { next(err); }
};

const adminGetAllBookings = async (req, res, next) => {
  try {
    const result = await vehicleBookingService.adminGetAllBookings(req.query);
    return success(res, 'All bookings fetched successfully', result);
  } catch (err) { next(err); }
};

const getOwnerBookings = async (req, res, next) => {
  try {
    const result = await vehicleBookingService.getOwnerBookings(req.user._id, req.query);
    return success(res, 'Your ride bookings fetched successfully', result);
  } catch (err) { next(err); }
};

const getBookingById = async (req, res, next) => {
  try {
    const result = await vehicleBookingService.getBookingById(req.params.id, req.user._id);
    return success(res, 'Booking fetched', result);
  } catch (err) { next(err); }
};

const getCustomerBookings = async (req, res, next) => {
  try {
    const result = await vehicleBookingService.getCustomerBookings(req.user._id, req.query);
    return success(res, 'Your ride bookings fetched', result);
  } catch (err) { next(err); }
};

module.exports = { acceptBooking, startRide, completeBooking, cancelBooking, adminGetAllBookings, getOwnerBookings, getBookingById, getCustomerBookings };
