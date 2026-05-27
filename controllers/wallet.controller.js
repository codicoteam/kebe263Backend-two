const walletService = require('../services/wallet.service');
const { success } = require('../utils/apiResponse');

const getMyWallet = async (req, res, next) => {
  try {
    const wallet = await walletService.getMyWallet(req.user._id);
    return success(res, 'Wallet fetched successfully', { wallet });
  } catch (err) { next(err); }
};

const deposit = async (req, res, next) => {
  try {
    const result = await walletService.depositViaPayNow(req.user._id, req.body);
    return success(res, 'Deposit initiated. Complete payment to credit your wallet.', result);
  } catch (err) { next(err); }
};

const paynowResult = async (req, res, next) => {
  try {
    await walletService.handlePaynowDeposit(req.body);
    return res.status(200).send('OK');
  } catch (err) { next(err); }
};

const getTransactions = async (req, res, next) => {
  try {
    const result = await walletService.getTransactions(req.user._id, req.query);
    return success(res, 'Transactions fetched successfully', result);
  } catch (err) { next(err); }
};

const adminGetAllWallets = async (req, res, next) => {
  try {
    const result = await walletService.adminGetAllWallets(req.query);
    return success(res, 'All wallets fetched successfully', result);
  } catch (err) { next(err); }
};

const transactionStatus = async (req, res, next) => {
  try {
    const result = await walletService.getTransactionStatus(req.user._id, req.params.reference);
    return success(res, 'Transaction status', result);
  } catch (err) { next(err); }
};

module.exports = { getMyWallet, deposit, paynowResult, getTransactions, adminGetAllWallets, transactionStatus };
