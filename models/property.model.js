const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'] },
    type: { type: String, enum: ['residential', 'commercial'], required: true },
    category: { type: String, required: true },
    purpose: { type: String, enum: ['rent', 'sale', 'overnight', 'daily', 'hourly'], required: true },
    price: { type: Number, required: [true, 'Price is required'] },
    currency: { type: String, enum: ['USD', 'ZWG'], default: 'USD' },
    rooms: { type: Number, default: null },
    location: {
      address: { type: String, default: null },
      city: { type: String, default: null },
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
    images: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false },
    pendingChange: {
      data: { type: mongoose.Schema.Types.Mixed, default: null },
      submittedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

propertySchema.index({ 'location.city': 1, type: 1, category: 1, purpose: 1, isApproved: 1 });
propertySchema.index({ 'location.geo': '2dsphere' }, { sparse: true });

propertySchema.pre('save', function (next) {
  if (this.location && typeof this.location.lat === 'number' && typeof this.location.lng === 'number') {
    this.location.geo = { type: 'Point', coordinates: [this.location.lng, this.location.lat] };
  } else if (this.location) {
    this.location.geo = undefined;
  }
  next();
});

module.exports = mongoose.model('Property', propertySchema);
