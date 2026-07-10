const Broadcast = require('../models/broadcast.model');
const Notification = require('../models/notification.model');

// `context` is which portal the requester is currently browsing (customer or
// serviceProvider), not their full roles array — a dual-role user browsing
// as a customer must never see a provider-only broadcast.
const getBroadcasts = async (userId, context, { page = 1, limit = 20 } = {}) => {
  const audiences = context === 'customer' || context === 'serviceProvider'
    ? ['all', context]
    : ['all'];

  const skip = (Number(page) - 1) * Number(limit);
  const [broadcasts, total, unread] = await Promise.all([
    Broadcast.find({ audience: { $in: audiences } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Broadcast.countDocuments({ audience: { $in: audiences } }),
    Notification.countDocuments({ recipient: userId, broadcastId: { $ne: null }, isRead: false }),
  ]);

  return {
    broadcasts,
    unreadCount: unread,
    pagination: { page: Number(page), limit: Number(limit), total },
  };
};

const markBroadcastsRead = async (userId) => {
  await Notification.updateMany(
    { recipient: userId, broadcastId: { $ne: null }, isRead: false },
    { $set: { isRead: true } }
  );
  return { message: 'Broadcasts marked read' };
};

module.exports = { getBroadcasts, markBroadcastsRead };
