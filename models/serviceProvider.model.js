const mongoose = require('mongoose');

const serviceProviderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    businessName: { type: String, required: [true, 'Business name is required'], trim: true },
    category: { type: String, required: true },
    description: { type: String, required: [true, 'Description is required'] },
    profileImage: { type: String, default: null },
    portfolioImages: [{ type: String }],
    estimatedPrice: { type: Number, required: [true, 'Estimated price is required'] },
    currency: { type: String, enum: ['USD', 'ZWG'], default: 'USD' },
    priceUnit: {
      type: String,
      enum: ['perHour', 'perDay', 'perJob', 'negotiable'],
      default: 'perJob',
    },
    location: {
      city: { type: String, default: null },
      address: { type: String, default: null },
      type: { type: String, default: null },
      coordinates: { type: [Number], default: undefined }, // [lng, lat] GeoJSON
    },
    isAvailable: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    depositPaid: { type: Boolean, default: false },
    depositAmount: { type: Number, default: 0 },
    depositReference: { type: String, default: null },
    depositPollUrl: { type: String, default: null },
    rating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceProviderSchema.pre('save', function (next) {
  if (this.location && this.location.coordinates && this.location.coordinates.length === 2) {
    this.location.type = 'Point';
  } else {
    if (this.location) {
      this.location.type = undefined;
      this.location.coordinates = undefined;
    }
  }
  next();
});

serviceProviderSchema.index({ location: '2dsphere' }, { sparse: true });
serviceProviderSchema.index({ category: 1, isApproved: 1, isAvailable: 1, depositPaid: 1 });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
