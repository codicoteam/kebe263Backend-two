const express = require('express');
const router = express.Router();
const broadcastController = require('../controllers/broadcast.controller');
const authenticate = require('../middleware/authenticate');

/**
 * @swagger
 * tags:
 *   name: Broadcasts
 *   description: Persistent, browsable broadcast history (the "Broadcasts" inbox thread)
 */

/**
 * @swagger
 * /api/broadcasts:
 *   get:
 *     summary: List broadcasts visible in the current portal context
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: context
 *         schema:
 *           type: string
 *           enum: [customer, serviceProvider]
 *         description: Which portal the requester is currently browsing — controls audience filtering for dual-role users
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Broadcasts for this audience/context
 */
router.get('/', authenticate, broadcastController.getBroadcasts);

/**
 * @swagger
 * /api/broadcasts/read:
 *   put:
 *     summary: Mark all broadcasts as read for the logged-in user
 *     tags: [Broadcasts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Marked read
 */
router.put('/read', authenticate, broadcastController.markBroadcastsRead);

module.exports = router;
