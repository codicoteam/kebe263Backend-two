const { Paynow } = require('paynow');
const Property = require('../models/property.model');
const PropertyBooking = require('../models/propertyBooking.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');
const { getConfig } = require('../utils/configCache');
const notify = require('../utils/notify');
const changeRequest = require('./listingChangeRequest.service');

const PROPERTY_EDITABLE_FIELDS = ['title', 'description', 'type', 'category', 'purpose', 'price', 'currency', 'rooms', 'location', 'images'];

const getOrCreateWallet = async (userId, currency = 'USD') => {
  let wallet = await Wallet.findOne({ owner: userId });
  if (!wallet) wallet = await Wallet.create({ owner: userId, balance: 0, currency });
  return wallet;
};

const getPaynow = () =>
  new Paynow(
    process.env.PAYNOW_ID,
    process.env.PAYNOW_KEY,
    process.env.PAYNOW_RESULT_URL,
    process.env.PAYNOW_RETURN_URL
  );

const stripLocation = (obj) => {
  const copy = { ...obj };
  delete copy.location;
  return copy;
};

// ─── Landlord ─────────────────────────────────────────────────────────────────

const createProperty = async (ownerId, data) => {
  const { title, description, type, category, purpose, price, currency, rooms, location, images } = data;
  if (!title || !description || !type || !category || !purpose || price == null) {
    throw { status: 400, message: 'title, description, type, category, purpose, and price are required' };
  }
  return Property.create({
    owner: ownerId,
    title,
    description,
    type,
    category,
    purpose,
    price,
    currency: currency || 'USD',
    rooms: rooms || null,
    location: location || {},
    images: images || [],
  });
};

const updateProperty = async (propertyId, ownerId, data) => {
  const property = await Property.findById(propertyId);
  if (!property) throw { status: 404, message: 'Property not found' };
  if (property.owner.toString() !== ownerId.toString()) {
    throw { status: 403, message: 'You can only edit your own listings' };
  }
  if (property.isApproved) {
    throw { status: 400, message: 'This listing is already approved — use request-change instead of editing it directly' };
  }

  const allowed = [...PROPERTY_EDITABLE_FIELDS, 'isAvailable'];
  for (const key of allowed) {
    if (data[key] !== undefined) property[key] = data[key];
  }

  await property.save();
  return property;
};

const requestPropertyChange = (propertyId, ownerId, data) =>
  changeRequest.requestChange(Property, propertyId, ownerId, PROPERTY_EDITABLE_FIELDS, data);

const approvePropertyChange = (propertyId) =>
  changeRequest.approveChange(Property, propertyId, PROPERTY_EDITABLE_FIELDS);

const rejectPropertyChange = (propertyId) =>
  changeRequest.rejectChange(Property, propertyId);

const ownerDisableProperty = (propertyId, ownerId, disabled) =>
  changeRequest.ownerDisable(Property, propertyId, ownerId, disabled);

const deleteProperty = async (propertyId, ownerId) => {
  const property = await Property.findById(propertyId);
  if (!property) throw { status: 404, message: 'Property not found' };
  if (property.owner.toString() !== ownerId.toString()) {
    throw { status: 403, message: 'You can only delete your own listings' };
  }
  await property.deleteOne();
};

const getMyProperties = async (ownerId, { page = 1, limit = 20 }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const [properties, total] = await Promise.all([
    Property.find({ owner: ownerId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Property.countDocuments({ owner: ownerId }),
  ]);
  return { properties, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

// ─── Customer ─────────────────────────────────────────────────────────────────

const listProperties = async ({ page = 1, limit = 20, type, category, purpose, city }) => {
  const query = { isApproved: true, isAvailable: true, isDisabled: { $ne: true } };
  if (type) query.type = type;
  if (category) query.category = category;
  if (purpose) query.purpose = purpose;
  if (city) query['location.city'] = { $regex: city, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
  const [docs, total] = await Promise.all([
    Property.find(query).select('-location').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Property.countDocuments(query),
  ]);
  return { properties: docs, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const getPropertyById = async (propertyId, userId) => {
  const property = await Property.findById(propertyId).populate('owner', 'firstName lastName phone email');
  if (!property || !property.isApproved || property.isDisabled) throw { status: 404, message: 'Property not found' };

  let viewUnlocked = false;
  if (userId) {
    const booking = await PropertyBooking.findOne({ property: propertyId, customer: userId, viewUnlocked: true });
    viewUnlocked = !!booking;
  }

  const obj = property.toObject();
  if (!viewUnlocked) {
    delete obj.location;
    if (obj.owner) obj.owner = { firstName: obj.owner.firstName, lastName: obj.owner.lastName };
  }

  return { ...obj, viewUnlocked };
};

const unlockProperty = async (propertyId, customer, { phone, method = 'ecocash', email }) => {
  const property = await Property.findById(propertyId);
  if (!property || !property.isApproved) throw { status: 404, message: 'Property not found' };

  const existing = await PropertyBooking.findOne({ property: propertyId, customer: customer._id, viewUnlocked: true });
  if (existing) throw { status: 400, message: 'You have already unlocked this property' };

  const UNLOCK_FEE = Number(await getConfig('unlockFee', process.env.UNLOCK_FEE || '1'));
  const reference = `PROP-${propertyId}-${customer._id}-${Date.now()}`;

  // Wallet payment settles synchronously — no gateway round-trip needed.
  if (method === 'wallet') {
    const wallet = await getOrCreateWallet(customer._id);
    if (wallet.balance < UNLOCK_FEE) {
      throw { status: 400, message: `Insufficient wallet balance. You need $${UNLOCK_FEE} to unlock this property.` };
    }
    wallet.balance = Number((wallet.balance - UNLOCK_FEE).toFixed(2));
    await wallet.save();

    const booking = await PropertyBooking.create({
      property: propertyId,
      customer: customer._id,
      paymentStatus: 'paid',
      paymentReference: reference,
      amountPaid: UNLOCK_FEE,
      viewUnlocked: true,
    });

    await WalletTransaction.create({
      wallet: wallet._id,
      type: 'deduction',
      amount: UNLOCK_FEE,
      reference,
      description: `Unlocked property "${property.title}"`,
      status: 'completed',
    });

    notify(customer._id, 'Property Unlocked', `Full details for "${property.title}" are now available.`, 'payment');
    notify(property.owner, 'Property Viewed', `Someone unlocked and viewed your property "${property.title}".`, 'payment');

    return {
      bookingId: booking._id,
      reference,
      pollUrl: null,
      redirectUrl: null,
      instructions: null,
      unlocked: true,
      amount: UNLOCK_FEE,
      currency: 'USD',
    };
  }

  const authEmail = email || process.env.PAYNOW_MERCHANT_EMAIL || customer.email;

  const paynow = getPaynow();
  const payment = paynow.createPayment(reference, authEmail);
  payment.add(`Unlock: ${property.title}`, UNLOCK_FEE);

  // Save pending booking before initiating — reference is needed by webhook
  const booking = await PropertyBooking.create({
    property: propertyId,
    customer: customer._id,
    paymentStatus: 'pending',
    paymentReference: reference,
    amountPaid: UNLOCK_FEE,
    viewUnlocked: false,
  });

  let resp;
  try {
    resp = phone ? await paynow.sendMobile(payment, phone, method) : await paynow.send(payment);
  } catch (err) {
    await PropertyBooking.findByIdAndDelete(booking._id);
    throw { status: 502, message: 'Could not reach payment gateway. Please try again.' };
  }

  if (!resp || !resp.success) {
    await PropertyBooking.findByIdAndDelete(booking._id);
    throw { status: 502, message: resp?.error || 'Payment initiation failed. Please try again.' };
  }

  // Persist pollUrl so status endpoint can query PayNow directly
  if (resp.pollUrl) {
    booking.pollUrl = resp.pollUrl;
    await booking.save();
  }

  return {
    bookingId: booking._id,
    reference,
    pollUrl: resp.pollUrl || null,
    redirectUrl: resp.redirectUrl || null,
    instructions: resp.instructions || null,
    amount: UNLOCK_FEE,
    currency: 'USD',
  };
};

// ─── PayNow webhook ───────────────────────────────────────────────────────────

const handlePaynowResult = async (rawBody) => {
  const paynow = getPaynow();
  // Verify hash from PayNow before trusting the payload
  const isValid = paynow.verifyHash(rawBody);
  if (!isValid) throw { status: 400, message: 'Invalid PayNow signature' };

  const { reference, status, paynowreference } = rawBody;
  if (!reference) return;

  const booking = await PropertyBooking.findOne({ paymentReference: reference });
  if (!booking || booking.viewUnlocked) return;

  if (status && status.toLowerCase() === 'paid') {
    booking.paymentStatus = 'paid';
    booking.viewUnlocked = true;
    if (paynowreference) booking.paymentReference = paynowreference;
    await booking.save();
    const property = await Property.findById(booking.property).select('title owner');
    if (property) {
      notify(booking.customer, 'Property Unlocked', `Full details for "${property.title}" are now available.`, 'payment');
      notify(property.owner, 'Property Viewed', `Someone unlocked and viewed your property "${property.title}".`, 'payment');
    }
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

const approveProperty = async (propertyId) => {
  const property = await Property.findByIdAndUpdate(propertyId, { isApproved: true }, { new: true });
  if (!property) throw { status: 404, message: 'Property not found' };
  return property;
};

const adminGetAllProperties = async ({ page = 1, limit = 20, isApproved, city, type, purpose }) => {
  const query = {};
  if (isApproved === 'false') query.$or = [{ isApproved: false }, { 'pendingChange.data': { $ne: null } }];
  else if (isApproved !== undefined) query.isApproved = isApproved === 'true';
  if (city) query['location.city'] = { $regex: city, $options: 'i' };
  if (type) query.type = type;
  if (purpose) query.purpose = purpose;

  const skip = (Number(page) - 1) * Number(limit);
  const [properties, total] = await Promise.all([
    Property.find(query).populate('owner', 'firstName lastName email phone').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Property.countDocuments(query),
  ]);
  return { properties, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const nearbyProperties = async ({ lat, lng, radius = 10, page = 1, limit = 20 }) => {
  if (!lat || !lng) throw { status: 400, message: 'lat and lng query parameters are required' };

  const radiusMeters = Number(radius) * 1000;
  const skip = (Number(page) - 1) * Number(limit);
  const matchQuery = { isApproved: true, isAvailable: true, isDisabled: { $ne: true } };

  const geoNearStage = {
    $geoNear: {
      near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
      distanceField: 'distanceMeters',
      maxDistance: radiusMeters,
      spherical: true,
      query: matchQuery,
    },
  };

  const [results, countResult] = await Promise.all([
    Property.aggregate([geoNearStage, { $skip: skip }, { $limit: Number(limit) }]),
    Property.aggregate([geoNearStage, { $count: 'total' }]),
  ]);

  const total = countResult[0]?.total || 0;
  const properties = results.map((doc) => ({
    ...doc,
    distanceKm: Number((doc.distanceMeters / 1000).toFixed(2)),
  }));

  return { properties, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const checkPropertyPaymentStatus = async (customerId, reference) => {
  const booking = await PropertyBooking.findOne({ paymentReference: reference, customer: customerId });
  if (!booking) return { status: 'pending', unlocked: false };
  if (booking.viewUnlocked) return { status: 'paid', unlocked: true };

  // Still pending — poll PayNow directly if we have the URL
  if (booking.pollUrl) {
    try {
      const paynow = getPaynow();
      const statusResp = await paynow.pollTransaction(booking.pollUrl);
      if (statusResp && statusResp.status && statusResp.status.toLowerCase() === 'paid') {
        booking.paymentStatus = 'paid';
        booking.viewUnlocked = true;
        await booking.save();
        const property = await Property.findById(booking.property).select('title owner');
        if (property) {
          notify(booking.customer, 'Property Unlocked', `Full details for "${property.title}" are now available.`, 'payment');
          notify(property.owner, 'Property Viewed', `Someone unlocked and viewed your property "${property.title}".`, 'payment');
        }
        return { status: 'paid', unlocked: true };
      }
    } catch (_) { /* network glitch — return pending */ }
  }

  return { status: 'pending', unlocked: false };
};

module.exports = {
  createProperty,
  updateProperty,
  deleteProperty,
  getMyProperties,
  listProperties,
  getPropertyById,
  unlockProperty,
  handlePaynowResult,
  approveProperty,
  adminGetAllProperties,
  nearbyProperties,
  checkPropertyPaymentStatus,
  requestPropertyChange,
  approvePropertyChange,
  rejectPropertyChange,
  ownerDisableProperty,
};
