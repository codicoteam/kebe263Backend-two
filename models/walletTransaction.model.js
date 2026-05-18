const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema(
  {
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
    type: { type: String, enum: ['deposit', 'deduction', 'withdrawal'], required: true },
    amount: { type: Number, required: true },
    reference: { type: String, default: null },
    description: { type: String, default: null },
    status: { type: String, enum: ['pending', 'completed'], default: 'completed' },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ reference: 1 }, { sparse: true });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
