const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]{3,20}$/, 'Code must be 3-20 alphanumeric characters'],
    },
    description: { type: String, default: null },
    discountType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
    discountPercent: { type: Number, min: 0, max: 100, default: 0 },
    discountAmount: { type: Number, min: 0, default: 0 },
    minBookingAmount: { type: Number, min: 0, default: 0 },
    maxUses: { type: Number, default: null },
    maxUsesPerUser: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    applicableTo: {
      type: String,
      enum: ['all', 'vehicle', 'service', 'property'],
      default: 'all',
    },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        usedAt: { type: Date, default: Date.now },
        bookingRef: { type: String, default: null },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

promoCodeSchema.index({ isActive: 1, expiresAt: 1 });
promoCodeSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
