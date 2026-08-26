require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');
const ServiceBooking = require('../models/serviceBooking.model');
const PropertyBooking = require('../models/propertyBooking.model');
const VehicleBooking = require('../models/vehicleBooking.model');

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) { console.error('Missing MongoDB URI'); process.exit(1); }

const EMAILS = ['alputhru@gmail.com'];
const AMOUNT = 50;

(async () => {
  await mongoose.connect(uri);
  console.log('MongoDB connected\n');

  for (const email of EMAILS) {
    console.log(`--- Processing: ${email} ---`);

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`  User not found: ${email}`);
      continue;
    }
    console.log(`  Found user: ${user.firstName} ${user.lastName} (${user._id})`);

    // --- Wallet credit ---
    let wallet = await Wallet.findOne({ owner: user._id });
    if (!wallet) {
      wallet = await Wallet.create({ owner: user._id, balance: 0, currency: 'USD' });
      console.log('  Created new wallet');
    } else {
      console.log(`  Existing balance: ${wallet.currency} ${wallet.balance}`);
    }

    wallet.balance = Number((wallet.balance + AMOUNT).toFixed(2));
    await wallet.save();

    await WalletTransaction.create({
      wallet: wallet._id,
      type: 'deposit',
      amount: AMOUNT,
      reference: `ADMIN-CREDIT-${Date.now()}`,
      description: 'Admin credit — manual top-up',
      status: 'completed',
    });
    console.log(`  Wallet credited $${AMOUNT}. New balance: ${wallet.currency} ${wallet.balance}`);

    // --- Mark bookings as paid ---
    const userId = user._id;

    const svcResult = await ServiceBooking.updateMany(
      { customer: userId, paymentStatus: 'pending' },
      { $set: { paymentStatus: 'paid' } }
    );
    console.log(`  ServiceBookings marked paid: ${svcResult.modifiedCount}`);

    const propResult = await PropertyBooking.updateMany(
      { customer: userId, paymentStatus: 'pending' },
      { $set: { paymentStatus: 'paid' } }
    );
    console.log(`  PropertyBookings marked paid: ${propResult.modifiedCount}`);

    const vehResult = await VehicleBooking.updateMany(
      { customer: userId, paymentStatus: 'pending' },
      { $set: { paymentStatus: 'paid' } }
    );
    console.log(`  VehicleBookings marked paid: ${vehResult.modifiedCount}`);

    console.log(`  Done for ${email}\n`);
  }

  await mongoose.disconnect();
  console.log('All done.');
})();
