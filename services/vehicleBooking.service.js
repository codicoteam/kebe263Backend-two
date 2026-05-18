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

const createBooking = async (customerId, vehicleId, data) => {
  const { pickupLocation, dropoffLocation, agreedPrice, currency } = data;
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
    currency: currency || vehicle.currency,
    status: 'pending',
  });

  notify(vehicle.owner, 'New Booking Request', `You have a new vehicle booking request. Agreed price: ${agreedPrice}`, 'booking');
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

  booking.status = 'accepted';
  await booking.save();
  notify(booking.customer, 'Booking Accepted', 'Your vehicle booking has been accepted. The driver is on the way.', 'booking');
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

  const platformFee = Number((booking.agreedPrice * (feePercent / 100)).toFixed(2));
  const ownerEarnings = Number((booking.agreedPrice - platformFee).toFixed(2));

  // Deduct platform fee from owner wallet
  const wallet = await getOrCreateWallet(booking.owner, booking.currency);
  wallet.balance = Number((wallet.balance - platformFee).toFixed(2));
  await wallet.save();

  await WalletTransaction.create({
    wallet: wallet._id,
    type: 'deduction',
    amount: platformFee,
    reference: `BOOKING-${bookingId}`,
    description: `Platform fee (${feePercent}%) for booking ${bookingId}`,
    status: 'completed',
  });

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

module.exports = { createBooking, acceptBooking, startRide, completeBooking, cancelBooking, adminGetAllBookings };
