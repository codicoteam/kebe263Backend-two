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
    ownerFullName: { type: String, trim: true, default: null },
    ownerIdNumber: { type: String, trim: true, default: null },
    driverLicenceFront: { type: String, default: null },
    driverLicenceBack: { type: String, default: null },
    nationalIdImage: { type: String, default: null },
    isAvailable: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: false },
    isDisabled: { type: Boolean, default: false }, // admin-controlled; distinct from owner's isAvailable toggle
    currentLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      updatedAt: { type: Date, default: null },
      type: { type: String, default: null }, // set to 'Point' only when real coordinates arrive
      coordinates: { type: [Number], default: undefined }, // [lng, lat] — set by socket driver:updateLocation
    },
  },
  { timestamps: true }
);

// Strip currentLocation when coordinates are absent so the sparse 2dsphere
// index skips this document entirely (sparse only works on missing fields,
// not on fields present-but-invalid).
vehicleSchema.pre('save', function (next) {
  if (!this.currentLocation?.coordinates?.length) {
    this.set('currentLocation', undefined);
  }
  next();
});

vehicleSchema.index({ type: 1, isApproved: 1, isAvailable: 1 });
vehicleSchema.index({ currentLocation: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
