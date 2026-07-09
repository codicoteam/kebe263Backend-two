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

const counterOffer = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.counterOffer(req.params.id, req.user._id, Number(req.body.counterPrice));
    return success(res, 'Counter offer sent to customer', { booking });
  } catch (err) { next(err); }
};

const acceptCounter = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.acceptCounter(req.params.id, req.user._id);
    return success(res, 'Counter offer accepted', { booking });
  } catch (err) { next(err); }
};

const rejectCounter = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.rejectCounter(req.params.id, req.user._id);
    return success(res, 'Counter offer declined', { booking });
  } catch (err) { next(err); }
};

const customerCounterOffer = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.customerCounterOffer(req.params.id, req.user._id, Number(req.body.counterPrice));
    return success(res, 'Counter offer sent to driver', { booking });
  } catch (err) { next(err); }
};

const acceptCustomerCounter = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.acceptCustomerCounter(req.params.id, req.user._id);
    return success(res, 'Customer counter offer accepted', { booking });
  } catch (err) { next(err); }
};

const rejectCustomerCounter = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.rejectCustomerCounter(req.params.id, req.user._id);
    return success(res, 'Customer counter offer declined', { booking });
  } catch (err) { next(err); }
};

const createOpenRideRequest = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.createOpenRideRequest(req.user._id, req.body);
    return success(res, 'Ride request broadcast to vehicle owners', { booking });
  } catch (err) { next(err); }
};

const getOpenRideRequests = async (req, res, next) => {
  try {
    const result = await vehicleBookingService.getOpenRideRequests(req.user._id, req.query);
    return success(res, 'Open ride requests fetched', result);
  } catch (err) { next(err); }
};

const claimOpenRideRequest = async (req, res, next) => {
  try {
    const booking = await vehicleBookingService.claimOpenRideRequest(req.params.id, req.user._id);
    return success(res, 'Ride request claimed and accepted', { booking });
  } catch (err) { next(err); }
};

module.exports = {
  acceptBooking, counterOffer, acceptCounter, rejectCounter,
  customerCounterOffer, acceptCustomerCounter, rejectCustomerCounter,
  startRide, completeBooking, cancelBooking, adminGetAllBookings, getOwnerBookings, getBookingById, getCustomerBookings,
  createOpenRideRequest, getOpenRideRequests, claimOpenRideRequest,
};
