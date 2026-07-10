const mongoose = require('mongoose');

// Persistent record of every admin broadcast, browsable as a "Broadcasts"
// thread in the client (separate from the ephemeral banner). `audience`
// controls who can see it in that thread — resolved against which portal
// (customer/serviceProvider) the viewer is currently in, not their full
// roles array, so a dual-role user doesn't see a provider-only broadcast
// while browsing as a customer.
const broadcastSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    audience: {
      type: String,
      enum: ['all', 'customer', 'serviceProvider'],
      default: 'all',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

broadcastSchema.index({ audience: 1, createdAt: -1 });

module.exports = mongoose.model('Broadcast', broadcastSchema);
