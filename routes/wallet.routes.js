const express = require('express');
const router = express.Router();
const walletController = require('../controllers/wallet.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Vehicle owner wallet and PayNow deposits
 */

// ─── PayNow webhook (no auth — called by PayNow) ──────────────────────────────

/**
 * @swagger
 * /api/wallet/paynow/result:
 *   post:
 *     summary: PayNow wallet deposit webhook (called by PayNow, not clients)
 *     tags: [Wallet]
 *     security: []
 *     responses:
 *       200:
 *         description: Acknowledged
 */
router.post('/paynow/result', walletController.paynowResult);

// ─── Admin (static before user routes) ───────────────────────────────────────

/**
 * @swagger
 * /api/wallet/admin/all:
 *   get:
 *     summary: Get all wallets (admin)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated wallets with owner details
 *       403:
 *         description: Admin only
 */
router.get('/admin/all', authenticate, isAdmin, walletController.adminGetAllWallets);

// ─── Authenticated user wallet ────────────────────────────────────────────────

/**
 * @swagger
 * /api/wallet:
 *   get:
 *     summary: Get my wallet balance (auto-creates wallet if first time)
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet with current balance
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, walletController.getMyWallet);

/**
 * @swagger
 * /api/wallet/deposit:
 *   post:
 *     summary: Deposit funds into wallet via PayNow
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 10
 *               currency:
 *                 type: string
 *                 enum: [USD, ZWG]
 *                 default: USD
 *               phone:
 *                 type: string
 *                 description: Mobile number for EcoCash/OneMoney. Omit for web redirect.
 *                 example: "0771111111"
 *               method:
 *                 type: string
 *                 enum: [ecocash, onemoney, telecash]
 *                 default: ecocash
 *     responses:
 *       200:
 *         description: PayNow payment initiated — wallet credited on webhook confirmation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transactionId: { type: string }
 *                 reference: { type: string }
 *                 pollUrl: { type: string, nullable: true }
 *                 redirectUrl: { type: string, nullable: true }
 *                 instructions: { type: string, nullable: true }
 *                 amount: { type: number }
 *                 currency: { type: string }
 *       400:
 *         description: Invalid amount
 *       502:
 *         description: PayNow gateway error
 */
router.post('/deposit', authenticate, walletController.deposit);

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get my wallet transaction history
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated transaction history
 *       401:
 *         description: Unauthorized
 */
router.get('/transactions', authenticate, walletController.getTransactions);

router.get('/transaction-status/:reference', authenticate, walletController.transactionStatus);

module.exports = router;
