const VehicleBooking = require('../models/vehicleBooking.model');
const Vehicle = require('../models/vehicle.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');
const { getConfig } = require('../utils/configCache');
const notify = require('../utils/notify');
const chatService = require('./chat.service');
const promoService = require('./promoCode.service');

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
  const { pickupLocation, dropoffLocation, agreedPrice, currency, transportReason, transportItems, promoCode } = data;
  if (!pickupLocation || !dropoffLocation || agreedPrice == null) {
    throw { status: 400, message: 'pickupLocation, dropoffLocation, and agreedPrice are required' };
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle || !vehicle.isApproved) throw { status: 404, message: 'Vehicle not found' };
  if (!vehicle.isAvailable) throw { status: 409, message: 'Vehicle is currently unavailable' };

  let finalPrice = agreedPrice;
  let discountAmount = 0;
  let promoCodeId = null;

  if (promoCode) {
    const promoResult = await promoService.applyPromoCode(
      promoCode, customerId, agreedPrice, 'vehicle'
    );
    discountAmount = promoResult.discountAmount;
    finalPrice = promoResult.finalAmount;
    promoCodeId = promoResult.promoId;
  }

  const booking = await VehicleBooking.create({
    vehicle: vehicleId,
    customer: customerId,
    owner: vehicle.owner,
    pickupLocation,
    dropoffLocation,
    agreedPrice: finalPrice,
    customerOfferedPrice: agreedPrice,
    originalPrice: agreedPrice,
    discountAmount,
    promoCode: promoCode ? promoCode.toUpperCase() : null,
    promoCodeId,
    currency: currency || vehicle.currency,
    status: 'pending',
    priceStatus: 'customerOffer',
    transportReason: transportReason || null,
    transportItems: transportItems || null,
  });

  notify(vehicle.owner, 'New Booking Request', `You have a new vehicle booking request. Customer offered: ${finalPrice}`, 'booking');
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

  const globalFee = await getConfig('platformFeePercent', process.env.PLATFORM_FEE_PERCENT || '10');
  const feePercent = Number(await getConfig('vehiclePlatformFeePercent', globalFee));
  const wallet = await getOrCreateWallet(booking.owner, booking.currency);
  await reservePlatformFee(booking, wallet, feePercent);

  booking.status = 'accepted';
  booking.priceStatus = 'agreed';
  const notifyCustomer = booking.customer;
  await booking.save();

  await booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type images' },
    { path: 'customer', select: 'firstName lastName phone email' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);

  notify(notifyCustomer, 'Booking Accepted', 'Your vehicle booking has been accepted. The driver is on the way.', 'booking');
  return booking;
};

const counterOffer = async (bookingId, ownerId, counterPrice) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'pending') throw { status: 400, message: `Cannot counter offer a booking with status: ${booking.status}` };
  if (!counterPrice || counterPrice <= 0) throw { status: 400, message: 'Counter price must be a positive number' };

  booking.ownerCounterPrice = counterPrice;
  booking.customerCounterPrice = null;
  booking.priceStatus = 'counterOffered';
  const notifyCustomer = booking.customer;
  const bookingCurrency = booking.currency;
  await booking.save();

  await booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type images' },
    { path: 'customer', select: 'firstName lastName phone email' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);

  notify(notifyCustomer, 'Driver Proposed a New Price', `Driver proposed ${bookingCurrency} ${counterPrice.toFixed(2)} — accept, decline, or counter back`, 'booking');
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

  const globalFee2 = await getConfig('platformFeePercent', process.env.PLATFORM_FEE_PERCENT || '10');
  const feePercent = Number(await getConfig('vehiclePlatformFeePercent', globalFee2));
  const wallet = await getOrCreateWallet(booking.owner, booking.currency);
  await reservePlatformFee(booking, wallet, feePercent);

  const notifyOwner = booking.owner;
  await booking.save();

  await booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type images' },
    { path: 'customer', select: 'firstName lastName phone email' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);

  notify(notifyOwner, 'Counter Offer Accepted', 'Customer accepted your counter offer. Proceed to pickup.', 'booking');
  return booking;
};

// Declining a counter does NOT cancel the booking — negotiation stays open.
// The owner's counter is cleared and the request reverts to the customer's
// original offer, so the owner can accept that price outright or counter again.
const rejectCounter = async (bookingId, customerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.customer.toString() !== customerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.priceStatus !== 'counterOffered') throw { status: 400, message: 'No counter offer to reject' };

  booking.ownerCounterPrice = null;
  booking.priceStatus = 'customerOffer';
  const notifyOwner = booking.owner;
  await booking.save();

  await booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type images' },
    { path: 'customer', select: 'firstName lastName phone email' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);

  notify(notifyOwner, 'Counter Offer Declined', 'Customer declined your counter offer — you can propose a new price or accept their original offer.', 'booking');
  return booking;
};

// Customer counters the owner's counter-offer with their own price.
const customerCounterOffer = async (bookingId, customerId, counterPrice) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.customer.toString() !== customerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'pending') throw { status: 400, message: `Cannot counter offer a booking with status: ${booking.status}` };
  if (booking.priceStatus !== 'counterOffered') throw { status: 400, message: 'No owner counter offer to respond to' };
  if (!counterPrice || counterPrice <= 0) throw { status: 400, message: 'Counter price must be a positive number' };

  booking.customerCounterPrice = counterPrice;
  booking.priceStatus = 'customerCountered';
  const notifyOwner = booking.owner;
  const bookingCurrency = booking.currency;
  await booking.save();

  await booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type images' },
    { path: 'customer', select: 'firstName lastName phone email' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);

  notify(notifyOwner, 'Customer Proposed a New Price', `Customer countered with ${bookingCurrency} ${counterPrice.toFixed(2)} — accept, decline, or counter again`, 'booking');
  return booking;
};

// Owner accepts the customer's counter-offer.
const acceptCustomerCounter = async (bookingId, ownerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.priceStatus !== 'customerCountered') throw { status: 400, message: 'No customer counter offer to accept' };

  booking.agreedPrice = booking.customerCounterPrice;
  booking.priceStatus = 'agreed';
  booking.status = 'accepted';

  const globalFee3 = await getConfig('platformFeePercent', process.env.PLATFORM_FEE_PERCENT || '10');
  const feePercent = Number(await getConfig('vehiclePlatformFeePercent', globalFee3));
  const wallet = await getOrCreateWallet(booking.owner, booking.currency);
  await reservePlatformFee(booking, wallet, feePercent);

  const notifyCustomer = booking.customer;
  await booking.save();

  await booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type images' },
    { path: 'customer', select: 'firstName lastName phone email' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);

  notify(notifyCustomer, 'Counter Offer Accepted', 'The driver accepted your counter offer. Proceed to pickup.', 'booking');
  return booking;
};

// Owner declines the customer's counter — their own last counter stands,
// negotiation stays open (owner can counter again or accept the customer's
// original offer since neither party has cancelled).
const rejectCustomerCounter = async (bookingId, ownerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.priceStatus !== 'customerCountered') throw { status: 400, message: 'No customer counter offer to reject' };

  booking.customerCounterPrice = null;
  booking.priceStatus = 'counterOffered';
  const notifyCustomer = booking.customer;
  await booking.save();

  await booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type images' },
    { path: 'customer', select: 'firstName lastName phone email' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);

  notify(notifyCustomer, 'Counter Offer Declined', 'The driver declined your counter — their previous price still stands. You can accept it or counter again.', 'booking');
  return booking;
};

const startRide = async (bookingId, ownerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'accepted') throw { status: 400, message: `Cannot start a booking with status: ${booking.status}` };

  booking.status = 'inProgress';
  await booking.save();

  notify(booking.customer, 'Ride Started', 'Your driver has started the ride. Have a safe trip with KEBE Super App!', 'booking');

  await booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type images' },
    { path: 'customer', select: 'firstName lastName phone email' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);

  return booking;
};

const completeBooking = async (bookingId, ownerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.owner.toString() !== ownerId.toString()) throw { status: 403, message: 'Not your booking' };
  if (booking.status !== 'inProgress') throw { status: 400, message: `Cannot complete a booking with status: ${booking.status}` };

  const globalFeeC = await getConfig('platformFeePercent', process.env.PLATFORM_FEE_PERCENT || '10');
  const feePercent = Number(await getConfig('vehiclePlatformFeePercent', globalFeeC));
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
  } else {
    // Open ride requests skip upfront reservation — deduct platform fee now at completion
    if (wallet.balance < platformFee) {
      throw {
        status: 400,
        message: `Insufficient wallet balance. Platform fee of ${booking.currency} ${platformFee} is required to complete this booking.`,
      };
    }
    wallet.balance = Number((wallet.balance - platformFee).toFixed(2));
    await wallet.save();

    await WalletTransaction.create({
      wallet: wallet._id,
      type: 'deduction',
      amount: platformFee,
      reference: `BOOKING-COMPLETE-${booking._id}`,
      description: `Platform fee (${feePercent}%) charged for booking ${bookingId}`,
      status: 'completed',
    });
  }

  booking.status = 'completed';
  booking.platformFee = platformFee;
  booking.ownerEarnings = ownerEarnings;
  booking.paymentStatus = 'paid';
  const notifyOwner = booking.owner;
  const notifyCustomer = booking.customer;
  await booking.save();

  await booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type images' },
    { path: 'customer', select: 'firstName lastName phone email' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);

  notify(notifyOwner, 'Ride Completed', `Ride completed. Your earnings: $${ownerEarnings}. Platform fee: $${platformFee}.`, 'payment');
  notify(notifyCustomer, 'Ride Completed', 'Your ride has been completed. Thank you for choosing KEBE Super App!', 'payment');

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
  const cancelledBy = booking.customer.toString() === userId.toString() ? 'customer' : 'owner';
  if (cancelledBy === 'customer') {
    notify(booking.owner, 'Ride Cancelled', 'A customer has cancelled their ride booking.', 'booking');
  } else {
    notify(booking.customer, 'Ride Cancelled', 'Your ride has been cancelled by the driver.', 'booking');
  }
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

const createOpenRideRequest = async (customerId, data) => {
  const { pickupLocation, dropoffLocation, offeredPrice, currency, vehicleType, transportReason, transportItems } = data;
  if (!pickupLocation || !dropoffLocation || offeredPrice == null) {
    throw { status: 400, message: 'pickupLocation, dropoffLocation, and offeredPrice are required' };
  }

  const booking = await VehicleBooking.create({
    vehicle: null,
    customer: customerId,
    owner: null,
    pickupLocation,
    dropoffLocation,
    agreedPrice: offeredPrice,
    customerOfferedPrice: offeredPrice,
    currency: currency || 'USD',
    status: 'pending',
    priceStatus: 'customerOffer',
    requestType: 'open',
    vehicleType: vehicleType || null,
    transportReason: transportReason || null,
    transportItems: transportItems || null,
  });

  return booking.populate({ path: 'customer', select: 'firstName lastName phone' });
};

const getOpenRideRequests = async (ownerId, query) => {
  const { page = 1, limit = 20 } = query;

  const spVehicle = await Vehicle.findOne({ owner: ownerId });

  const q = { requestType: 'open', status: 'pending', owner: null };
  if (spVehicle) {
    q.$or = [{ vehicleType: spVehicle.type }, { vehicleType: { $in: [null, ''] } }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [bookings, total] = await Promise.all([
    VehicleBooking.find(q)
      .populate('customer', 'firstName lastName phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    VehicleBooking.countDocuments(q),
  ]);
  return { bookings, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const claimOpenRideRequest = async (bookingId, ownerId) => {
  const booking = await VehicleBooking.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };
  if (booking.requestType !== 'open') throw { status: 400, message: 'This booking is not an open request' };
  if (booking.status !== 'pending' || booking.owner != null) {
    throw { status: 409, message: 'This request has already been claimed or is no longer available' };
  }

  const vehicle = await Vehicle.findOne({ owner: ownerId });
  if (!vehicle) throw { status: 400, message: 'You need to register a vehicle before accepting ride requests. Go to My Vehicle to add one.' };
  if (!vehicle.isAvailable) throw { status: 409, message: 'Your vehicle is currently unavailable. Mark it as available in My Vehicle settings.' };

  if (booking.vehicleType && booking.vehicleType !== vehicle.type) {
    throw { status: 400, message: `This request requires a ${booking.vehicleType}` };
  }

  booking.vehicle = vehicle._id;
  booking.owner = ownerId;
  booking.status = 'accepted';
  booking.priceStatus = 'agreed';

  // Pre-calculate fee amounts on the booking record so completeBooking
  // can settle them at ride completion — no upfront wallet deduction for open requests.
  const globalFeeO = await getConfig('platformFeePercent', process.env.PLATFORM_FEE_PERCENT || '10');
  const feePercent = Number(await getConfig('vehiclePlatformFeePercent', globalFeeO));
  booking.platformFee = Number((booking.agreedPrice * (feePercent / 100)).toFixed(2));
  booking.ownerEarnings = Number((booking.agreedPrice - booking.platformFee).toFixed(2));

  await booking.save();

  notify(booking.customer, 'Ride Accepted!', 'A driver has accepted your ride request.', 'booking');
  chatService.createOrGetRoomForBooking('vehicle', booking._id.toString(), [booking.customer.toString(), ownerId.toString()]).catch(() => {});

  return booking.populate([
    { path: 'vehicle', select: 'make model year color plateNumber type' },
    { path: 'customer', select: 'firstName lastName phone' },
    { path: 'owner', select: 'firstName lastName phone' },
  ]);
};

module.exports = {
  createBooking, createOpenRideRequest, getOpenRideRequests, claimOpenRideRequest, acceptBooking,
  counterOffer, acceptCounter, rejectCounter, customerCounterOffer, acceptCustomerCounter, rejectCustomerCounter,
  startRide, completeBooking, cancelBooking, adminGetAllBookings, getOwnerBookings, getBookingById, getCustomerBookings,
};
