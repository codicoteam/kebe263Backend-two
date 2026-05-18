const ServiceBooking = require('../models/serviceBooking.model');
const ServiceProvider = require('../models/serviceProvider.model');
const ServiceReview = require('../models/serviceReview.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');
const { getConfig } = require('../utils/configCache');
const notify = require('../utils/notify');
const chatService = require('./chat.service');

const getOrCreateWallet = async (userId, currency = 'USD') => {
  let wallet = await Wallet.findOne({ owner: userId });
  if (!wallet) wallet = await Wallet.create({ owner: userId, balance: 0, currency });
  return wallet;
};

const createBooking = async (customerId, serviceId, data) => {
  const { description, scheduledDate, location, agreedPrice, currency } = data;
  if (!agreedPrice) throw { status: 400, message: 'agreedPrice is required' };

  const service = await ServiceProvider.findById(serviceId);
  if (!service || !service.isApproved || !service.depositPaid) throw { status: 404, message: 'Service not found' };
  if (!service.isAvailable) throw { status: 409, message: 'Service provider is currently unavailable' };

  const booking = await ServiceBooking.create({
    service: serviceId,
    customer: customerId,
    provider: service.owner,
    description: description || null,
    scheduledDate: scheduledDate || null,
    location: location || {},
    agreedPrice,
    currency: currency || service.currency,
    status: 'pending',
  });

  notify(service.owner, 'New Service Booking', `New booking request for "${service.businessName}". Agreed price: ${agreedPrice}`, 'booking');
  chatService.createOrGetRoomForBooking('service', booking._id.toString(), [customerId.toString(), service.owner.toString()]).catch(() => {});

  return booking.populate([
    { path: 'service', select: 'businessName category estimatedPrice' },
    { path: 'customer', select: 'firstName lastName phone' },
    { path: 'provider', select: 'firstName lastName phone' },
  ]);
};

const acceptBooking = async (bookingId, providerId) => {
  const booking = await ServiceBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.provider.toString() !== providerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'pending') throw { status: 400, message: `Cannot accept booking with status: ${booking.status}` };
  booking.status = 'accepted';
  await booking.save();
  notify(booking.customer, 'Booking Accepted', 'Your service booking has been accepted by the provider.', 'booking');
  return booking;
};

const startBooking = async (bookingId, providerId) => {
  const booking = await ServiceBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.provider.toString() !== providerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'accepted') throw { status: 400, message: `Cannot start booking with status: ${booking.status}` };
  booking.status = 'inProgress';
  await booking.save();
  return booking;
};

const completeBooking = async (bookingId, providerId) => {
  const booking = await ServiceBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.provider.toString() !== providerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'inProgress') throw { status: 400, message: `Cannot complete booking with status: ${booking.status}` };

  const feePercent = Number(await getConfig('platformFeePercent', process.env.PLATFORM_FEE_PERCENT || '10'));

  const platformFee = Number((booking.agreedPrice * (feePercent / 100)).toFixed(2));
  const providerEarnings = Number((booking.agreedPrice - platformFee).toFixed(2));

  const wallet = await getOrCreateWallet(booking.provider, booking.currency);
  wallet.balance = Number((wallet.balance - platformFee).toFixed(2));
  await wallet.save();

  await WalletTransaction.create({
    wallet: wallet._id,
    type: 'deduction',
    amount: platformFee,
    reference: `SERVICE-BOOKING-${bookingId}`,
    description: `Platform fee (${feePercent}%) for service booking ${bookingId}`,
    status: 'completed',
  });

  booking.status = 'completed';
  booking.platformFee = platformFee;
  booking.providerEarnings = providerEarnings;
  booking.paymentStatus = 'paid';
  await booking.save();

  notify(booking.provider, 'Service Completed', `Service completed. Your earnings: $${providerEarnings}. Platform fee: $${platformFee}.`, 'payment');
  notify(booking.customer, 'Service Completed', 'Your service booking has been completed. Please leave a review!', 'review');

  return { booking, platformFee, providerEarnings, feePercent, walletBalance: wallet.balance };
};

const cancelBooking = async (bookingId, userId) => {
  const booking = await ServiceBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };

  const isParty =
    booking.customer.toString() === userId.toString() ||
    booking.provider.toString() === userId.toString();
  if (!isParty) throw { status: 403, message: 'Not your booking' };
  if (['completed', 'cancelled'].includes(booking.status)) {
    throw { status: 400, message: `Cannot cancel booking with status: ${booking.status}` };
  }

  booking.status = 'cancelled';
  await booking.save();
  return booking;
};

const leaveReview = async (bookingId, customerId, { rating, comment }) => {
  if (!rating) throw { status: 400, message: 'rating is required' };

  const booking = await ServiceBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.customer.toString() !== customerId.toString()) throw { status: 403, message: 'Only the customer can leave a review' };
  if (booking.status !== 'completed') throw { status: 400, message: 'Can only review completed bookings' };

  const existing = await ServiceReview.findOne({ booking: bookingId });
  if (existing) throw { status: 409, message: 'You have already reviewed this booking' };

  const review = await ServiceReview.create({
    booking: bookingId,
    customer: customerId,
    provider: booking.provider,
    rating: Number(rating),
    comment: comment || null,
  });

  // Recalculate provider average rating
  const agg = await ServiceReview.aggregate([
    { $match: { provider: booking.provider } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  if (agg.length > 0) {
    await ServiceProvider.findOneAndUpdate(
      { owner: booking.provider },
      { rating: Number(agg[0].avgRating.toFixed(1)), totalReviews: agg[0].count }
    );
  }

  return review;
};

const adminGetAllBookings = async ({ page = 1, limit = 20, status }) => {
  const query = {};
  if (status) query.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [bookings, total] = await Promise.all([
    ServiceBooking.find(query)
      .populate('service', 'businessName category')
      .populate('customer', 'firstName lastName phone')
      .populate('provider', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ServiceBooking.countDocuments(query),
  ]);
  return { bookings, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

module.exports = {
  createBooking, acceptBooking, startBooking, completeBooking,
  cancelBooking, leaveReview, adminGetAllBookings,
};
