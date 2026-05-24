const storageService = require('../services/storage.service');
const { success, error } = require('../utils/apiResponse');
const path = require('path');

const signUploadUrl = async (req, res, next) => {
  try {
    const { fileName } = req.body;
    if (!fileName || typeof fileName !== 'string') {
      return error(res, 'fileName is required', 400);
    }

    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(fileName).toLowerCase();
    if (!allowed.includes(ext)) {
      return error(res, 'Only jpg, jpeg, png, and webp images are allowed', 400);
    }

    const safeName = `property_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const result = await storageService.createSignedUploadUrl(safeName);
    return success(res, 'Signed upload URL created', result);
  } catch (err) {
    next(err);
  }
};

module.exports = { signUploadUrl };
