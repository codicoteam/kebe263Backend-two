const mongoose = require('mongoose');

const vehicleBookingSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    requestType: { type: String, enum: ['direct', 'open'], default: 'direct' },
    vehicleType: { type: String, default: null },
    pickupLocation: {
      address: { type: String, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    dropoffLocation: {
      address: { type: String, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'inProgress', 'completed', 'cancelled'],
      default: 'pending',
    },
    agreedPrice: { type: Number, default: 0 },
    currency: { type: String, enum: ['USD', 'ZWG'], default: 'USD' },
    platformFee: { type: Number, default: 0 },
    ownerEarnings: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentReference: { type: String, default: null },
    refundStatus: { type: String, enum: ['none', 'requested', 'refunded'], default: 'none' },
    refundReason: { type: String, default: null },
    refundedAt: { type: Date, default: null },
    promoCode: { type: String, default: null },
    promoCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', default: null },
    discountAmount: { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 },
    transportReason: { type: String, default: null },
    transportItems: { type: String, default: null },
    customerOfferedPrice: { type: Number, default: 0 },
    ownerCounterPrice: { type: Number, default: null },
    priceStatus: { type: String, enum: ['customerOffer', 'counterOffered', 'agreed'], default: 'customerOffer' },
  },
  { timestamps: true }
);

vehicleBookingSchema.index({ customer: 1, status: 1 });
vehicleBookingSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('VehicleBooking', vehicleBookingSchema);
