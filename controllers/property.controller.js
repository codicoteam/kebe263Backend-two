const propertyService = require('../services/property.service');
const { success, error } = require('../utils/apiResponse');

// ─── Landlord ─────────────────────────────────────────────────────────────────

const createProperty = async (req, res, next) => {
  try {
    const property = await propertyService.createProperty(req.user._id, req.body);
    return success(res, 'Property listed successfully. Pending admin approval.', { property }, 201);
  } catch (err) {
    next(err);
  }
};

const updateProperty = async (req, res, next) => {
  try {
    const property = await propertyService.updateProperty(req.params.id, req.user._id, req.body);
    return success(res, 'Property updated successfully', { property });
  } catch (err) {
    next(err);
  }
};

const requestPropertyChange = async (req, res, next) => {
  try {
    const property = await propertyService.requestPropertyChange(req.params.id, req.user._id, req.body);
    return success(res, 'Change submitted for admin review. Your listing is hidden until it is approved.', { property });
  } catch (err) { next(err); }
};

const ownerDisableProperty = async (req, res, next) => {
  try {
    const property = await propertyService.ownerDisableProperty(req.params.id, req.user._id, req.body.disabled !== false);
    return success(res, req.body.disabled !== false ? 'Property disabled' : 'Property re-enabled', { property });
  } catch (err) { next(err); }
};

const deleteProperty = async (req, res, next) => {
  try {
    await propertyService.deleteProperty(req.params.id, req.user._id);
    return success(res, 'Property deleted successfully');
  } catch (err) {
    next(err);
  }
};

const getMyProperties = async (req, res, next) => {
  try {
    const result = await propertyService.getMyProperties(req.user._id, req.query);
    return success(res, 'Your listings fetched successfully', result);
  } catch (err) {
    next(err);
  }
};

// ─── Customer ─────────────────────────────────────────────────────────────────

const listProperties = async (req, res, next) => {
  try {
    const result = await propertyService.listProperties(req.query);
    return success(res, 'Properties fetched successfully', result);
  } catch (err) {
    next(err);
  }
};

const getPropertyById = async (req, res, next) => {
  try {
    const property = await propertyService.getPropertyById(req.params.id, req.user?._id);
    return success(res, 'Property fetched successfully', { property });
  } catch (err) {
    next(err);
  }
};

const unlockProperty = async (req, res, next) => {
  try {
    const result = await propertyService.unlockProperty(req.params.id, req.user, req.body);
    return success(res, 'Payment initiated. Complete payment to view full property details.', result);
  } catch (err) {
    next(err);
  }
};

// ─── PayNow webhook ───────────────────────────────────────────────────────────

const paynowResult = async (req, res, next) => {
  try {
    await propertyService.handlePaynowResult(req.body);
    return res.status(200).send('OK');
  } catch (err) {
    next(err);
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

const approveProperty = async (req, res, next) => {
  try {
    const property = await propertyService.approveProperty(req.params.id);
    return success(res, 'Property approved successfully', { property });
  } catch (err) {
    next(err);
  }
};

const adminGetAllProperties = async (req, res, next) => {
  try {
    const result = await propertyService.adminGetAllProperties(req.query);
    return success(res, 'All properties fetched successfully', result);
  } catch (err) {
    next(err);
  }
};

const nearbyProperties = async (req, res, next) => {
  try {
    const result = await propertyService.nearbyProperties(req.query);
    return success(res, 'Nearby properties fetched successfully', result);
  } catch (err) { next(err); }
};

const paymentStatus = async (req, res, next) => {
  try {
    const result = await propertyService.checkPropertyPaymentStatus(req.user._id, req.params.reference);
    return success(res, 'Payment status', result);
  } catch (err) { next(err); }
};

module.exports = {
  createProperty,
  updateProperty,
  requestPropertyChange,
  ownerDisableProperty,
  deleteProperty,
  getMyProperties,
  listProperties,
  getPropertyById,
  unlockProperty,
  paynowResult,
  approveProperty,
  adminGetAllProperties,
  nearbyProperties,
  paymentStatus,
};
