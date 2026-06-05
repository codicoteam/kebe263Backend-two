const promoService = require('../services/promoCode.service');
const { success } = require('../utils/apiResponse');

// ─── Admin ────────────────────────────────────────────────────────────────────

const createPromoCode = async (req, res, next) => {
  try {
    const promo = await promoService.createPromoCode(req.user._id, req.body);
    return success(res, 'Promo code created', { promoCode: promo }, 201);
  } catch (err) { next(err); }
};

const getAllPromoCodes = async (req, res, next) => {
  try {
    const result = await promoService.adminGetAllPromoCodes(req.query);
    return success(res, 'Promo codes fetched', result);
  } catch (err) { next(err); }
};

const getPromoById = async (req, res, next) => {
  try {
    const promo = await promoService.getPromoById(req.params.id);
    return success(res, 'Promo code fetched', { promoCode: promo });
  } catch (err) { next(err); }
};

const updatePromoCode = async (req, res, next) => {
  try {
    const promo = await promoService.updatePromoCode(req.user._id, req.params.id, req.body);
    return success(res, 'Promo code updated', { promoCode: promo });
  } catch (err) { next(err); }
};

const deletePromoCode = async (req, res, next) => {
  try {
    await promoService.deletePromoCode(req.user._id, req.params.id);
    return success(res, 'Promo code deleted');
  } catch (err) { next(err); }
};

const assignPromoCode = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return next({ status: 400, message: 'userId is required' });
    const promo = await promoService.assignPromoToUser(req.user._id, req.params.id, userId);
    return success(res, 'Promo code assigned and user notified', { promoCode: promo });
  } catch (err) { next(err); }
};

// ─── Customer ─────────────────────────────────────────────────────────────────

const validatePromoCode = async (req, res, next) => {
  try {
    const { code, amount, serviceType } = req.body;
    if (!code || !amount) return next({ status: 400, message: 'code and amount are required' });
    const result = await promoService.validatePromoCode(
      code, req.user._id, Number(amount), serviceType || 'all'
    );
    return success(res, 'Promo code is valid', result);
  } catch (err) { next(err); }
};

const getMyPromoCodes = async (req, res, next) => {
  try {
    const promoCodes = await promoService.getMyPromoCodes(req.user._id);
    return success(res, 'Your promo codes fetched', { promoCodes });
  } catch (err) { next(err); }
};

module.exports = {
  createPromoCode, getAllPromoCodes, getPromoById,
  updatePromoCode, deletePromoCode, assignPromoCode,
  validatePromoCode, getMyPromoCodes,
};
