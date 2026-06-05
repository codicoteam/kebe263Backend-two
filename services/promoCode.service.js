const PromoCode = require('../models/promoCode.model');
const notify = require('../utils/notify');

const createPromoCode = async (adminId, data) => {
  const {
    code, description, discountType = 'percent', discountPercent = 0,
    discountAmount = 0, minBookingAmount = 0, maxUses = null,
    maxUsesPerUser = 1, expiresAt = null, applicableTo = 'all',
    assignedTo = [],
  } = data;

  if (!code) throw { status: 400, message: 'code is required' };
  if (discountType === 'percent' && (discountPercent <= 0 || discountPercent > 100)) {
    throw { status: 400, message: 'discountPercent must be between 1 and 100' };
  }
  if (discountType === 'fixed' && discountAmount <= 0) {
    throw { status: 400, message: 'discountAmount must be greater than 0 for fixed discounts' };
  }

  const existing = await PromoCode.findOne({ code: code.toUpperCase() });
  if (existing) throw { status: 409, message: `Promo code "${code.toUpperCase()}" already exists` };

  const promo = await PromoCode.create({
    code: code.toUpperCase(),
    description,
    discountType,
    discountPercent,
    discountAmount,
    minBookingAmount,
    maxUses,
    maxUsesPerUser,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    applicableTo,
    assignedTo,
    createdBy: adminId,
  });

  if (assignedTo && assignedTo.length > 0) {
    const msg = discountType === 'percent'
      ? `You have a ${discountPercent}% off promo code: ${promo.code}. Use it on your next booking!`
      : `You have a $${discountAmount} off promo code: ${promo.code}. Use it on your next booking!`;
    for (const userId of assignedTo) {
      notify(userId, 'You Have a Promo Code!', msg, 'system');
    }
  }

  return promo;
};

const validatePromoCode = async (code, userId, amount, serviceType = 'all') => {
  const promo = await PromoCode.findOne({ code: code.toUpperCase() });
  if (!promo) throw { status: 404, message: 'Promo code not found' };
  if (!promo.isActive) throw { status: 400, message: 'This promo code is no longer active' };
  if (promo.expiresAt && new Date() > promo.expiresAt) {
    throw { status: 400, message: 'This promo code has expired' };
  }
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
    throw { status: 400, message: 'This promo code has reached its usage limit' };
  }
  if (promo.applicableTo !== 'all' && promo.applicableTo !== serviceType) {
    throw { status: 400, message: `This promo code is only valid for ${promo.applicableTo} bookings` };
  }
  if (amount < promo.minBookingAmount) {
    throw {
      status: 400,
      message: `This promo code requires a minimum booking amount of $${promo.minBookingAmount}`,
    };
  }
  if (promo.assignedTo.length > 0) {
    const isAssigned = promo.assignedTo.some((id) => id.toString() === userId.toString());
    if (!isAssigned) throw { status: 403, message: 'This promo code was not assigned to you' };
  }

  const userUses = promo.usedBy.filter((u) => u.user.toString() === userId.toString()).length;
  if (userUses >= promo.maxUsesPerUser) {
    throw { status: 400, message: 'You have already used this promo code the maximum number of times' };
  }

  const discountAmount = promo.discountType === 'percent'
    ? Number((amount * (promo.discountPercent / 100)).toFixed(2))
    : Math.min(promo.discountAmount, amount);

  const finalAmount = Number((amount - discountAmount).toFixed(2));

  return {
    valid: true,
    promoId: promo._id,
    code: promo.code,
    discountType: promo.discountType,
    discountPercent: promo.discountPercent,
    discountAmount,
    originalAmount: amount,
    finalAmount,
    description: promo.description,
  };
};

const applyPromoCode = async (code, userId, amount, serviceType, bookingRef = null) => {
  const result = await validatePromoCode(code, userId, amount, serviceType);

  await PromoCode.findOneAndUpdate(
    { code: code.toUpperCase() },
    {
      $inc: { usedCount: 1 },
      $push: { usedBy: { user: userId, usedAt: new Date(), bookingRef } },
    }
  );

  return result;
};

const getMyPromoCodes = async (userId) => {
  const now = new Date();
  const [assigned, used] = await Promise.all([
    PromoCode.find({
      $and: [
        { isActive: true },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        { $or: [{ assignedTo: userId }, { assignedTo: { $size: 0 } }] },
      ],
    }).lean(),
    PromoCode.find({ 'usedBy.user': userId }).lean(),
  ]);

  const allPromos = [
    ...assigned.map((p) => {
      const userUseCount = p.usedBy.filter((u) => u.user.toString() === userId.toString()).length;
      return { ...p, status: userUseCount >= p.maxUsesPerUser ? 'used' : 'available' };
    }),
    ...used
      .filter((p) => !assigned.some((a) => a._id.toString() === p._id.toString()))
      .map((p) => ({ ...p, status: 'used' })),
  ];

  const seen = new Set();
  return allPromos.filter((p) => {
    if (seen.has(p._id.toString())) return false;
    seen.add(p._id.toString());
    return true;
  });
};

const adminGetAllPromoCodes = async ({ page = 1, limit = 20, isActive, applicableTo, search }) => {
  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (applicableTo) query.applicableTo = applicableTo;
  if (search) query.code = { $regex: search.toUpperCase(), $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
  const [promoCodes, total] = await Promise.all([
    PromoCode.find(query)
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    PromoCode.countDocuments(query),
  ]);

  return {
    promoCodes,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  };
};

const getPromoById = async (promoId) => {
  const promo = await PromoCode.findById(promoId)
    .populate('createdBy', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email phone')
    .populate('usedBy.user', 'firstName lastName email');
  if (!promo) throw { status: 404, message: 'Promo code not found' };
  return promo;
};

const assignPromoToUser = async (adminId, promoId, userId) => {
  const promo = await PromoCode.findById(promoId);
  if (!promo) throw { status: 404, message: 'Promo code not found' };

  const alreadyAssigned = promo.assignedTo.some((id) => id.toString() === userId.toString());
  if (alreadyAssigned) throw { status: 409, message: 'Promo code already assigned to this user' };

  promo.assignedTo.push(userId);
  await promo.save();

  const msg = promo.discountType === 'percent'
    ? `You have received a ${promo.discountPercent}% off promo code: ${promo.code}. Use it on your next booking!`
    : `You have received a $${promo.discountAmount} off promo code: ${promo.code}. Use it on your next booking!`;

  notify(userId, 'You Have a Promo Code!', msg, 'system');
  return promo;
};

const updatePromoCode = async (adminId, promoId, data) => {
  const promo = await PromoCode.findById(promoId);
  if (!promo) throw { status: 404, message: 'Promo code not found' };

  const allowed = [
    'description', 'discountType', 'discountPercent', 'discountAmount',
    'minBookingAmount', 'maxUses', 'maxUsesPerUser', 'expiresAt',
    'isActive', 'applicableTo',
  ];

  for (const key of allowed) {
    if (data[key] !== undefined) promo[key] = data[key];
  }

  await promo.save();
  return promo;
};

const deletePromoCode = async (adminId, promoId) => {
  const promo = await PromoCode.findById(promoId);
  if (!promo) throw { status: 404, message: 'Promo code not found' };
  await promo.deleteOne();
};

module.exports = {
  createPromoCode,
  validatePromoCode,
  applyPromoCode,
  getMyPromoCodes,
  adminGetAllPromoCodes,
  getPromoById,
  assignPromoToUser,
  updatePromoCode,
  deletePromoCode,
};
