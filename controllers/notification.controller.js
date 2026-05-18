const Notification = require('../models/notification.model');
const { success } = require('../utils/apiResponse');

const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [notifications, total] = await Promise.all([
      Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Notification.countDocuments({ recipient: req.user._id }),
    ]);
    return success(res, 'Notifications fetched', {
      notifications,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
};

const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return success(res, 'Notification not found', null, 404);
    return success(res, 'Marked as read', { notification });
  } catch (err) { next(err); }
};

const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
    return success(res, `${result.modifiedCount} notifications marked as read`);
  } catch (err) { next(err); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return success(res, 'Unread count fetched', { unreadCount: count });
  } catch (err) { next(err); }
};

module.exports = { getMyNotifications, markRead, markAllRead, getUnreadCount };
