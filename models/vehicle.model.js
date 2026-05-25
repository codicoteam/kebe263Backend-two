const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    make: { type: String, required: [true, 'Make is required'], trim: true },
    model: { type: String, required: [true, 'Model is required'], trim: true },
    year: { type: Number, required: [true, 'Year is required'] },
    color: { type: String, required: [true, 'Color is required'], trim: true },
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: { type: String, required: true },
    capacityKg: { type: Number, default: null },
    capacityPassengers: { type: Number, default: null },
    pricePerKm: { type: Number, required: [true, 'Price per km is required'] },
    currency: { type: String, enum: ['USD', 'ZWG'], default: 'USD' },
    images: [{ type: String }],
    isAvailable: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], default: undefined }, // [lng, lat] — set by socket driver:updateLocation
    },
  },
  { timestamps: true }
);

vehicleSchema.index({ type: 1, isApproved: 1, isAvailable: 1 });
vehicleSchema.index({ currentLocation: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
