require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) { console.error('Missing MongoDB URI'); process.exit(1); }

const EMAIL = 'zondaimakaza01@gmail.com';
const AMOUNT = 20;

(async () => {
  await mongoose.connect(uri);
  console.log('MongoDB connected');

  const user = await User.findOne({ email: EMAIL });
  if (!user) { console.error(`User not found: ${EMAIL}`); process.exit(1); }
  console.log(`Found user: ${user.firstName} ${user.lastName} (${user._id})`);

  let wallet = await Wallet.findOne({ owner: user._id });
  if (!wallet) {
    wallet = await Wallet.create({ owner: user._id, balance: 0, currency: 'USD' });
    console.log('Created new wallet');
  } else {
    console.log(`Existing balance: ${wallet.currency} ${wallet.balance}`);
  }

  wallet.balance = Number((wallet.balance + AMOUNT).toFixed(2));
  await wallet.save();

  await WalletTransaction.create({
    wallet: wallet._id,
    type: 'deposit',
    amount: AMOUNT,
    reference: 'TEST-SEED-CREDIT',
    description: 'Test subscription credit — seeded manually',
    status: 'completed',
  });

  console.log(`✅ Wallet updated. New balance: ${wallet.currency} ${wallet.balance}`);
  await mongoose.disconnect();
})();
