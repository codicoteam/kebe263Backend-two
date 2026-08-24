const storageService = require('../services/storage.service');
const { success, error } = require('../utils/apiResponse');
const path = require('path');

const signUploadUrl = async (req, res, next) => {
  try {
    const rawName = req.body.fileName || req.body.filename;
    if (!rawName || typeof rawName !== 'string') {
      return error(res, 'fileName or filename is required', 400);
    }

    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ext = path.extname(rawName).toLowerCase();
    if (!allowed.includes(ext)) {
      return error(res, 'Only jpg, jpeg, png, webp, and pdf files are allowed', 400);
    }

    const prefix = req.body.folder || 'media';
    const safeName = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const result = await storageService.createSignedUploadUrl(safeName);
    return success(res, 'Signed upload URL created', {
      ...result,
      uploadUrl: result.signedUrl,
      fileUrl: result.publicUrl,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { signUploadUrl };
