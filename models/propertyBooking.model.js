const mongoose = require('mongoose');

const propertyBookingSchema = new mongoose.Schema(
  {
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
    paymentReference: { type: String, default: null },
    amountPaid: { type: Number, default: 0 },
    viewUnlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

propertyBookingSchema.index({ property: 1, customer: 1 });

module.exports = mongoose.model('PropertyBooking', propertyBookingSchema);
