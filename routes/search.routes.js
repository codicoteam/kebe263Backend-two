const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const authenticate = require('../middleware/authenticate');

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Global search across properties, vehicles, and services
 */

/**
 * @swagger
 * /api/search:
 *   get:
 *     summary: Global search across all modules
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Search term (min 2 characters)
 *         example: "plumber"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, property, vehicle, service]
 *           default: all
 *         description: Limit search to a specific module
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *         description: Optional. If provided with lng, adds distanceKm to results and sorts nearest-first.
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *         description: Max results per module
 *     responses:
 *       200:
 *         description: Grouped search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 properties:
 *                   type: array
 *                   items: { type: object }
 *                   description: Matching properties (omitted if type != all|property)
 *                 vehicles:
 *                   type: array
 *                   items: { type: object }
 *                   description: Matching vehicles (omitted if type != all|vehicle)
 *                 services:
 *                   type: array
 *                   items: { type: object }
 *                   description: Matching services (omitted if type != all|service)
 *       400:
 *         description: Search query too short
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, searchController.globalSearch);

module.exports = router;
