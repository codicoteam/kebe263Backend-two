const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, default: 'image' },
    name: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, trim: true, default: '' },
    imageUrl: { type: String, default: null },
    attachments: [attachmentSchema],
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

chatMessageSchema.index({ room: 1, createdAt: -1 });
chatMessageSchema.index({ room: 1, isRead: 1, sender: 1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

