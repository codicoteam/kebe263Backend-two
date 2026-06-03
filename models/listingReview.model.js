const mongoose = require('mongoose');

const listingReviewSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    listingKind: { type: String, enum: ['vehicle', 'accommodation'], required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, default: null },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: null },
  },
  { timestamps: true }
);

listingReviewSchema.index({ listingId: 1, customer: 1 }, { unique: true });
listingReviewSchema.index({ listingId: 1 });

module.exports = mongoose.model('ListingReview', listingReviewSchema);
