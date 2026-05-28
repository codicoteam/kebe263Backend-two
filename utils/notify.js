const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const admin = require('../config/firebase');

const sendFcmPush = async (userId, tokens, title, body) => {
  if (!tokens || tokens.length === 0) return;
  try {
    const response = await admin.messaging().sendEachForMulticast({
      notification: { title, body },
      tokens,
    });
    if (response.failureCount > 0) {
      const deadTokens = tokens.filter((_, i) => !response.responses[i].success);
      console.warn(`[FCM] ${response.failureCount}/${tokens.length} tokens failed`);
      await User.updateOne({ _id: userId }, { $pull: { fcmTokens: { $in: deadTokens } } });
    }
  } catch (err) {
    console.error('[FCM] Push failed:', err.message);
  }
};

const createNotification = async (recipientId, title, message, type = 'system') => {
  try {
    const [notification, user] = await Promise.all([
      Notification.create({ recipient: recipientId, title, message, type }),
      User.findById(recipientId).select('+fcmTokens').lean(),
    ]);
    if (user?.fcmTokens?.length > 0) {
      sendFcmPush(recipientId, user.fcmTokens, title, message);
    }
    return notification;
  } catch (err) {
    console.error('[Notify] Failed:', err.message);
  }
};

module.exports = createNotification;
