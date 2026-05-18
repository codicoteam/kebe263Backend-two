const Notification = require('../models/notification.model');

const createNotification = async (recipientId, title, message, type = 'system') => {
  try {
    return await Notification.create({ recipient: recipientId, title, message, type });
  } catch (err) {
    console.error('[Notify] Failed to create notification:', err.message);
  }
};

module.exports = createNotification;
