const serviceBookingService = require('../services/serviceBooking.service');
const { success } = require('../utils/apiResponse');

const acceptBooking = async (req, res, next) => {
  try {
    const booking = await serviceBookingService.acceptBooking(req.params.id, req.user._id);
    return success(res, 'Booking accepted', { booking });
  } catch (err) { next(err); }
};

const startBooking = async (req, res, next) => {
  try {
    const booking = await serviceBookingService.startBooking(req.params.id, req.user._id);
    return success(res, 'Service started', { booking });
  } catch (err) { next(err); }
};

const completeBooking = async (req, res, next) => {
  try {
    const result = await serviceBookingService.completeBooking(req.params.id, req.user._id);
    return success(res, `Service completed. Platform fee: $${result.platformFee}. Your earnings: $${result.providerEarnings}`, result);
  } catch (err) { next(err); }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await serviceBookingService.cancelBooking(req.params.id, req.user._id);
    return success(res, 'Booking cancelled', { booking });
  } catch (err) { next(err); }
};

const leaveReview = async (req, res, next) => {
  try {
    const review = await serviceBookingService.leaveReview(req.params.id, req.user._id, req.body);
    return success(res, 'Review submitted successfully', { review }, 201);
  } catch (err) { next(err); }
};

const adminGetAllBookings = async (req, res, next) => {
  try {
    const result = await serviceBookingService.adminGetAllBookings(req.query);
    return success(res, 'All service bookings fetched successfully', result);
  } catch (err) { next(err); }
};

module.exports = { acceptBooking, startBooking, completeBooking, cancelBooking, leaveReview, adminGetAllBookings };
