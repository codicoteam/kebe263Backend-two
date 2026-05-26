const VehicleBooking = require('../models/vehicleBooking.model');
const Vehicle = require('../models/vehicle.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');
const { getConfig } = require('../utils/configCache');
const notify = require('../utils/notify');
const chatService = require('./chat.service');

const getOrCreateWallet = async (ownerId, currency = 'USD') => {
  let wallet = await Wallet.findOne({ owner: ownerId });
  if (!wallet) wallet = await Wallet.create({ owner: ownerId, balance: 0, currency });
  return wallet;
};

const reservePlatformFee = async (booking, wallet, feePercent) => {
  const platformFee = Number((booking.agreedPrice * (feePercent / 100)).toFixed(2));
  if (wallet.balance < platformFee) {
    throw {
      status: 400,
      message: `Insufficient wallet balance. Please deposit ${booking.currency} ${platformFee} to reserve the platform fee for this booking.`,
    };
  }

  wallet.balance = Number((wallet.balance - platformFee).toFixed(2));
  await wallet.save();

  await WalletTransaction.create({
    wallet: wallet._id,
    type: 'deduction',
    amount: platformFee,
    reference: `BOOKING-RESERVE-${booking._id}`,
    description: `Reserved platform fee for booking ${booking._id}`,
    status: 'pending',
  });

  booking.platformFee = platformFee;
  booking.ownerEarnings = Number((booking.agreedPrice - platformFee).toFixed(2));
  await booking.save();
  return booking;
};

const releaseReservedPlatformFee = async (booking) => {
  if (!booking.platformFee || booking.platformFee <= 0) return;

  const wallet = await getOrCreateWallet(booking.owner, booking.currency);
  const transaction = await WalletTransaction.findOne({
    wallet: wallet._id,
    reference: `BOOKING-RESERVE-${booking._id}`,
    type: 'deduction',
    status: 'pending',
  });

  if (!transaction) return;

  wallet.balance = Number((wallet.balance + transaction.amount).toFixed(2));
  await wallet.save();

  await transaction.deleteOne();
};

const createBooking = async (customerId, vehicleId, data) => {
  const { pickupLocation, dropoffLocation, agreedPrice, currency, transportReason, transportItems } = data;
  if (!pickupLocation || !dropoffLocation || agreedPrice == null) {
    throw { status: 400, message: 'pickupLocation, dropoffLocation, and agreedPrice are required' };
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle || !vehicle.isApproved) throw { status: 404, message: 'Vehicle not found' };
  if (!vehicle.isAvailable) throw { status: 409, message: 'Vehicle is currently unavailable' };

  const booking = await VehicleBooking.create({
    vehicle: vehicleId,
    customer: customerId,
    owner: vehicle.owner,
    pickupLocation,
    dropoffLocation,
    agreedPrice,
    customerOfferedPrice: agreedPrice,
    currency: currency || vehicle.currency,
    status: 'pending',
    priceStatus: 'customerOffer',
    transportReason: transportReason || null,
    transportItems: transportItems || null,
  });

  notify(vehicle.owner, 'New Booking Request', `You have a new vehicle booking request. Customer offered: ${agreedPrice}`, 'booking');
  chatService.createOrGetRoomForBooking('vehicle', booking._id.toString(), [customerId.toString(), vehicle.owner.toString()]).catch(() => {});

  return booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type' },
    { path: 'customer', select: 'firstName lastName phone' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);
};

const acceptBooking = async (bookingId, ownerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'pending') throw { status: 400, message: `Cannot accept a booking with status: ${booking.status}` };
  if (booking.priceStatus === 'counterOffered') throw { status: 400, message: 'A counter offer is pending. Customer must accept or decline first.' };

  const feePercent = Number(await getConfig('platformFeePercent', process.env.PLATFORM_FEE_PERCENT || '10'));
  const wallet = await getOrCreateWallet(booking.owner, booking.currency);
  await reservePlatformFee(booking, wallet, feePercent);

  booking.status = 'accepted';
  booking.priceStatus = 'agreed';
  await booking.save();

  notify(booking.customer, 'Booking Accepted', 'Your vehicle booking has been accepted. The driver is on the way.', 'booking');
  return booking;
};

const counterOffer = async (bookingId, ownerId, counterPrice) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'pending') throw { status: 400, message: `Cannot counter offer a booking with status: ${booking.status}` };
  if (!counterPrice || counterPrice <= 0) throw { status: 400, message: 'Counter price must be a positive number' };

  booking.ownerCounterPrice = counterPrice;
  booking.priceStatus = 'counterOffered';
  await booking.save();

  notify(booking.customer, 'Driver Proposed a New Price', `Driver proposed ${booking.currency} ${counterPrice.toFixed(2)} — accept or decline`, 'booking');
  return booking;
};

const acceptCounter = async (bookingId, customerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.customer.toString() !== customerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.priceStatus !== 'counterOffered') throw { status: 400, message: 'No counter offer to accept' };

  booking.agreedPrice = booking.ownerCounterPrice;
  booking.priceStatus = 'agreed';
  booking.status = 'accepted';

  const feePercent = Number(await getConfig('platformFeePercent', process.env.PLATFORM_FEE_PERCENT || '10'));
  const wallet = await getOrCreateWallet(booking.owner, booking.currency);
  await reservePlatformFee(booking, wallet, feePercent);

  await booking.save();

  notify(booking.owner, 'Counter Offer Accepted', 'Customer accepted your counter offer. Proceed to pickup.', 'booking');
  return booking;
};

const rejectCounter = async (bookingId, customerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.customer.toString() !== customerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.priceStatus !== 'counterOffered') throw { status: 400, message: 'No counter offer to reject' };

  booking.status = 'cancelled';
  booking.priceStatus = 'customerOffer';
  await booking.save();

  notify(booking.owner, 'Counter Offer Declined', 'Customer declined your counter offer.', 'booking');
  return booking;
};

const startRide = async (bookingId, ownerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'accepted') throw { status: 400, message: `Cannot start a booking with status: ${booking.status}` };

  booking.status = 'inProgress';
  await booking.save();
  return booking;
};

const completeBooking = async (bookingId, ownerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'inProgress') throw { status: 400, message: `Cannot complete a booking with status: ${booking.status}` };

  const feePercent = Number(await getConfig('platformFeePercent', process.env.PLATFORM_FEE_PERCENT || '10'));
  const platformFee = booking.platformFee || Number((booking.agreedPrice * (feePercent / 100)).toFixed(2));
  const ownerEarnings = booking.ownerEarnings || Number((booking.agreedPrice - platformFee).toFixed(2));

  const wallet = await getOrCreateWallet(booking.owner, booking.currency);
  const transaction = await WalletTransaction.findOne({
    wallet: wallet._id,
    reference: `BOOKING-RESERVE-${booking._id}`,
    type: 'deduction',
    status: 'pending',
  });

  if (transaction) {
    transaction.status = 'completed';
    transaction.description = `Platform fee (${feePercent}%) charged for booking ${bookingId}`;
    await transaction.save();
  }

  booking.status = 'completed';
  booking.platformFee = platformFee;
  booking.ownerEarnings = ownerEarnings;
  booking.paymentStatus = 'paid';
  await booking.save();

  notify(booking.owner, 'Ride Completed', `Ride completed. Your earnings: $${ownerEarnings}. Platform fee: $${platformFee}.`, 'payment');
  notify(booking.customer, 'Ride Completed', 'Your ride has been completed. Thank you for using kebe263!', 'payment');

  return { booking, platformFee, ownerEarnings, feePercent, walletBalance: wallet.balance };
};

const cancelBooking = async (bookingId, userId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };

  const isParty =
    booking.customer.toString() === userId.toString() ||
    booking.owner.toString() === userId.toString();
  if (!isParty) throw { status: 403, message: 'Not your booking' };

  if (['completed', 'cancelled'].includes(booking.status)) {
    throw { status: 400, message: `Cannot cancel a booking with status: ${booking.status}` };
  }

  await releaseReservedPlatformFee(booking);

  booking.status = 'cancelled';
  await booking.save();
  return booking;
};

const adminGetAllBookings = async ({ page = 1, limit = 20, status }) => {
  const query = {};
  if (status) query.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [bookings, total] = await Promise.all([
    VehicleBooking.find(query)
      .populate('vehicle', 'make model plateNumber')
      .populate('customer', 'firstName lastName phone')
      .populate('owner', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    VehicleBooking.countDocuments(query),
  ]);
  return { bookings, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const getCustomerBookings = async (customerId, { page = 1, limit = 20, status }) => {
  const query = { customer: customerId };
  if (status) query.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [bookings, total] = await Promise.all([
    VehicleBooking.find(query)
      .populate('vehicle', 'make model year color plateNumber type images pricePerKm currency currentLocation')
      .populate('owner', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    VehicleBooking.countDocuments(query),
  ]);
  return { bookings, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const getOwnerBookings = async (ownerId, { page = 1, limit = 20, status }) => {
  const query = { owner: ownerId };
  if (status) query.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [bookings, total] = await Promise.all([
    VehicleBooking.find(query)
      .populate('vehicle', 'make model year color plateNumber type pricePerKm currency images')
      .populate('customer', 'firstName lastName phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    VehicleBooking.countDocuments(query),
  ]);
  return { bookings, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const getBookingById = async (bookingId, userId) => {
  const booking = await VehicleBooking.findById(bookingId)
    .populate('vehicle', 'make model year color plateNumber type pricePerKm currency images currentLocation')
    .populate('customer', 'firstName lastName phone email')
    .populate('owner', 'firstName lastName phone email');
  if (!booking) throw { status: 404, message: 'Booking not found' };
  const isParty =
    booking.customer._id.toString() === userId.toString() ||
    booking.owner._id.toString() === userId.toString();
  if (!isParty) throw { status: 403, message: 'Not your booking' };
  return { booking };
};

module.exports = { createBooking, acceptBooking, counterOffer, acceptCounter, rejectCounter, startRide, completeBooking, cancelBooking, adminGetAllBookings, getOwnerBookings, getBookingById, getCustomerBookings };
