const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    bookingType: { type: String, enum: ['service', 'vehicle', 'property', 'support', 'direct'], required: true },
    bookingId: { type: String, required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

chatRoomSchema.index({ bookingType: 1, bookingId: 1 }, { unique: true });
chatRoomSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
