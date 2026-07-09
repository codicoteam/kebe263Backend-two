const mongoose = require('mongoose');

const bookingReportSchema = new mongoose.Schema(
  {
    bookingKind: { type: String, enum: ['vehicle', 'service'], required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reportedRole: { type: String, enum: ['customer', 'provider'], required: true },
    reason: {
      type: String,
      enum: ['completed_early', 'no_show', 'unsafe_behavior', 'payment_dispute', 'other'],
      required: true,
    },
    description: { type: String, default: null },
    status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
    adminNote: { type: String, default: null },
  },
  { timestamps: true }
);

bookingReportSchema.index({ booking: 1 });
bookingReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('BookingReport', bookingReportSchema);
