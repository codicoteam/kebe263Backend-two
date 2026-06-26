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
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: undefined }, // [lng, lat] GeoJSON — auto-set by pre-save
    },
    images: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

propertySchema.index({ 'location.city': 1, type: 1, category: 1, purpose: 1, isApproved: 1 });
propertySchema.index({ location: '2dsphere' }, { sparse: true });

propertySchema.pre('save', function () {
  if (this.location && this.location.lat && this.location.lng) {
    this.location.type = 'Point';
    this.location.coordinates = [this.location.lng, this.location.lat];
  }
});

module.exports = mongoose.model('Property', propertySchema);
