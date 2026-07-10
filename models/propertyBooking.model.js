const mongoose = require('mongoose');

const propertyBookingSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentReference: { type: String, default: null },
    pollUrl: { type: String, default: null },
    amountPaid: { type: Number, default: 0 },
    refundStatus: { type: String, enum: ['none', 'requested', 'refunded'], default: 'none' },
    refundReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    viewUnlocked: { type: Boolean, default: false },
    promoCode: { type: String, default: null },
    promoCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', default: null },
    discountAmount: { type: Number, default: 0 },
    originalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

propertyBookingSchema.index({ property: 1, customer: 1 });

module.exports = mongoose.model('PropertyBooking', propertyBookingSchema);
