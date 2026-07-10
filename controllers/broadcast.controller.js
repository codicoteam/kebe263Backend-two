const broadcastService = require('../services/broadcast.service');
const { success } = require('../utils/apiResponse');

const getBroadcasts = async (req, res, next) => {
  try {
    const { context, page, limit } = req.query;
    const result = await broadcastService.getBroadcasts(req.user._id, context, { page, limit });
    return success(res, 'Broadcasts fetched', result);
  } catch (err) {
    next(err);
  }
};

const markBroadcastsRead = async (req, res, next) => {
  try {
    const result = await broadcastService.markBroadcastsRead(req.user._id);
    return success(res, result.message);
  } catch (err) {
    next(err);
  }
};

module.exports = { getBroadcasts, markBroadcastsRead };
