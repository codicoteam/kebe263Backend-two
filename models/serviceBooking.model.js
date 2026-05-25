const mongoose = require('mongoose');

const serviceBookingSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceProvider', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, default: null },
    scheduledDate: { type: Date, default: null },
    location: {
      address: { type: String, default: null },
      city: { type: String, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    serviceType: {
      type: String,
      enum: ['provider_comes_to_me', 'i_go_to_provider'],
      default: 'provider_comes_to_me',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'inProgress', 'completed', 'cancelled'],
      default: 'pending',
    },
    agreedPrice: { type: Number, default: 0 },
    currency: { type: String, enum: ['USD', 'ZWG'], default: 'USD' },
    platformFee: { type: Number, default: 0 },
    providerEarnings: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentReference: { type: String, default: null },
    refundStatus: { type: String, enum: ['none', 'requested', 'refunded'], default: 'none' },
    refundReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    providerLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

serviceBookingSchema.index({ customer: 1, status: 1 });
serviceBookingSchema.index({ provider: 1, status: 1 });

module.exports = mongoose.model('ServiceBooking', serviceBookingSchema);
