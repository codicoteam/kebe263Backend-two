const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    bookingType: { type: String, enum: ['service', 'vehicle', 'property', 'support', 'direct'], required: true },
    bookingId: { type: String, required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    // Set when a customer/provider taps "Request admin" in a direct/booking
    // room. Surfaces the room in the admin "Needs Attention" queue until an
    // admin replies, at which point it's cleared automatically.
    adminRequested: { type: Boolean, default: false },
    adminRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminRequestedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

chatRoomSchema.index({ bookingType: 1, bookingId: 1 }, { unique: true });
chatRoomSchema.index({ participants: 1, lastMessageAt: -1 });
chatRoomSchema.index({ adminRequested: 1, lastMessageAt: -1 });

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
