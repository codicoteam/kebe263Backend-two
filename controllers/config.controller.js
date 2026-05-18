const AppConfig = require('../models/appConfig.model');
const { success, error } = require('../utils/apiResponse');

const getPlatformFee = async (req, res, next) => {
  try {
    const config = await AppConfig.findOne({ key: 'platformFeePercent' });
    const value = config ? config.value : (Number(process.env.PLATFORM_FEE_PERCENT) || 10);
    return success(res, 'Platform fee fetched', { platformFeePercent: value });
  } catch (err) { next(err); }
};

const setPlatformFee = async (req, res, next) => {
  try {
    const { platformFeePercent } = req.body;
    if (platformFeePercent == null || isNaN(Number(platformFeePercent))) {
      return error(res, 'platformFeePercent must be a valid number', 400);
    }
    const value = Number(platformFeePercent);
    if (value < 0 || value > 100) {
      return error(res, 'platformFeePercent must be between 0 and 100', 400);
    }
    const config = await AppConfig.findOneAndUpdate(
      { key: 'platformFeePercent' },
      { value, description: 'Percentage cut taken from vehicle booking owner earnings' },
      { upsert: true, new: true }
    );
    return success(res, `Platform fee updated to ${value}%`, { platformFeePercent: config.value });
  } catch (err) { next(err); }
};

module.exports = { getPlatformFee, setPlatformFee };
