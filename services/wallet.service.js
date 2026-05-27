const { Paynow } = require('paynow');
const Wallet = require('../models/wallet.model');
const WalletTransaction = require('../models/walletTransaction.model');

const getPaynow = () =>
  new Paynow(
    process.env.PAYNOW_ID,
    process.env.PAYNOW_KEY,
    process.env.PAYNOW_WALLET_RESULT_URL || process.env.PAYNOW_RESULT_URL,
    process.env.PAYNOW_RETURN_URL
  );

const getOrCreateWallet = async (userId, currency = 'USD') => {
  let wallet = await Wallet.findOne({ owner: userId });
  if (!wallet) wallet = await Wallet.create({ owner: userId, balance: 0, currency });
  return wallet;
};

const getMyWallet = async (userId) => {
  return getOrCreateWallet(userId);
};

const depositViaPayNow = async (userId, { amount, currency = 'USD', phone, method = 'ecocash' }) => {
  if (!amount || Number(amount) <= 0) throw { status: 400, message: 'A positive deposit amount is required' };

  const wallet = await getOrCreateWallet(userId, currency);
  const reference = `WALLET-${userId}-${Date.now()}`;
  const authEmail = process.env.PAYNOW_MERCHANT_EMAIL;

  const paynow = getPaynow();
  const payment = paynow.createPayment(reference, authEmail);
  payment.add('Wallet Deposit', Number(amount));

  // Save pending transaction — webhook or poll will flip to completed and credit wallet
  const transaction = await WalletTransaction.create({
    wallet: wallet._id,
    type: 'deposit',
    amount: Number(amount),
    reference,
    description: 'Wallet deposit via PayNow',
    status: 'pending',
    pollUrl: null, // set after PayNow responds
  });

  let resp;
  try {
    resp = phone ? await paynow.sendMobile(payment, phone, method) : await paynow.send(payment);
  } catch {
    await WalletTransaction.findByIdAndDelete(transaction._id);
    throw { status: 502, message: 'Could not reach payment gateway. Please try again.' };
  }

  if (!resp || !resp.success) {
    await WalletTransaction.findByIdAndDelete(transaction._id);
    throw { status: 502, message: resp?.error || 'Payment initiation failed. Please try again.' };
  }

  // Persist pollUrl so status endpoint can query PayNow directly
  if (resp.pollUrl) {
    transaction.pollUrl = resp.pollUrl;
    await transaction.save();
  }

  return {
    transactionId: transaction._id,
    reference,
    pollUrl: resp.pollUrl || null,
    redirectUrl: resp.redirectUrl || null,
    instructions: resp.instructions || null,
    amount: Number(amount),
    currency,
  };
};

const handlePaynowDeposit = async (rawBody) => {
  const paynow = getPaynow();
  const isValid = paynow.verifyHash(rawBody);
  if (!isValid) throw { status: 400, message: 'Invalid PayNow signature' };

  const { reference, status } = rawBody;
  if (!reference || !status) return;

  const transaction = await WalletTransaction.findOne({ reference, status: 'pending', type: 'deposit' });
  if (!transaction) return;

  if (status.toLowerCase() === 'paid') {
    const wallet = await Wallet.findById(transaction.wallet);
    if (!wallet) return;

    wallet.balance = Number((wallet.balance + transaction.amount).toFixed(2));
    await wallet.save();

    transaction.status = 'completed';
    await transaction.save();
  }
};

const getTransactions = async (userId, { page = 1, limit = 20 }) => {
  const wallet = await Wallet.findOne({ owner: userId });
  if (!wallet) return { transactions: [], pagination: { total: 0, page: 1, limit: Number(limit), pages: 0 } };

  const skip = (Number(page) - 1) * Number(limit);
  const [transactions, total] = await Promise.all([
    WalletTransaction.find({ wallet: wallet._id }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    WalletTransaction.countDocuments({ wallet: wallet._id }),
  ]);
  return { wallet, transactions, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const adminGetAllWallets = async ({ page = 1, limit = 20 }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const [wallets, total] = await Promise.all([
    Wallet.find().populate('owner', 'firstName lastName email phone').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Wallet.countDocuments(),
  ]);
  return { wallets, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const getTransactionStatus = async (userId, reference) => {
  const wallet = await Wallet.findOne({ owner: userId });
  if (!wallet) return { status: 'pending' };
  const txn = await WalletTransaction.findOne({ wallet: wallet._id, reference });
  if (!txn) return { status: 'pending' };
  if (txn.status === 'completed') return { status: 'completed' };

  // Still pending — ask PayNow directly if we have the poll URL
  if (txn.pollUrl) {
    try {
      const paynow = getPaynow();
      const statusResp = await paynow.pollTransaction(txn.pollUrl);
      if (statusResp && statusResp.paid()) {
        wallet.balance = Number((wallet.balance + txn.amount).toFixed(2));
        await wallet.save();
        txn.status = 'completed';
        await txn.save();
        return { status: 'completed' };
      }
    } catch (_) { /* network glitch — return pending */ }
  }

  return { status: 'pending' };
};

module.exports = { getMyWallet, depositViaPayNow, handlePaynowDeposit, getTransactions, adminGetAllWallets, getTransactionStatus };
