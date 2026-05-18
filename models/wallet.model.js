const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance: { type: Number, default: 0 },
    currency: { type: String, enum: ['USD', 'ZWG'], default: 'USD' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', walletSchema);
