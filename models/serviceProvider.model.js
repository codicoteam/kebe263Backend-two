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
      // Flat lat/lng — this is the shape the mobile app reads (SpServiceLocation)
      // and sends on create/update, so keep it as the source of truth for display.
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      // Geo point lives in its own sub-field (not siblings of city/address) so the
      // sparse 2dsphere index below only sees a value when real coordinates exist —
      // a sparse index on `location` itself would still see {city, address} and crash
      // with "Can't extract geo keys" since that object isn't valid GeoJSON.
      geo: {
        type: { type: String, enum: ['Point'], default: undefined },
        coordinates: { type: [Number], default: undefined }, // [lng, lat] — auto-set by pre-save
      },
    },
    isAvailable: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    pendingChange: {
      data: { type: mongoose.Schema.Types.Mixed, default: null },
      submittedAt: { type: Date, default: null },
    },
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
  if (this.location && typeof this.location.lat === 'number' && typeof this.location.lng === 'number') {
    this.location.geo = { type: 'Point', coordinates: [this.location.lng, this.location.lat] };
  } else if (this.location) {
    this.location.geo = undefined;
  }
  next();
});

serviceProviderSchema.index({ 'location.geo': '2dsphere' }, { sparse: true });
serviceProviderSchema.index({ category: 1, isApproved: 1, isAvailable: 1, depositPaid: 1 });

module.exports = mongoose.model('ServiceProvider', serviceProviderSchema);
