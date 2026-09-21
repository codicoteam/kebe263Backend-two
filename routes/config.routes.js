const express = require('express');
const router = express.Router();
const configController = require('../controllers/config.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');

/**
 * @swagger
 * tags:
 *   name: Config
 *   description: Admin-managed platform configuration
 */

/**
 * @swagger
 * /api/config/platform-fee:
 *   get:
 *     summary: Get current platform fee percentage
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current platform fee percent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 platformFeePercent: { type: number, example: 10 }
 */
router.get('/platform-fee', authenticate, isAdmin, configController.getPlatformFee);

/**
 * @swagger
 * /api/config/platform-fee:
 *   put:
 *     summary: Update platform fee percentage (admin)
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platformFeePercent]
 *             properties:
 *               platformFeePercent:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 15
 *     responses:
 *       200:
 *         description: Platform fee updated
 *       400:
 *         description: Invalid value
 *       403:
 *         description: Admin only
 */
router.put('/platform-fee', authenticate, isAdmin, configController.setPlatformFee);

/**
 * @swagger
 * /api/config/vehicle-pricing:
 *   get:
 *     summary: Get the admin-configured minimum vehicle price per km (any authenticated user)
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Minimum price per km used to compute ride offer suggestions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 minPricePerKm: { type: number, example: 0.5 }
 */
router.get('/vehicle-pricing', authenticate, configController.getVehiclePricing);

module.exports = router;
