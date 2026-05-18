const mongoose = require('mongoose');

const serviceReviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceBooking', required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: [1, 'Rating min 1'], max: [5, 'Rating max 5'] },
    comment: { type: String, default: null },
  },
  { timestamps: true }
);

serviceReviewSchema.index({ provider: 1 });

module.exports = mongoose.model('ServiceReview', serviceReviewSchema);
