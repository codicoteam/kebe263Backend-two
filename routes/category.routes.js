const express = require('express');
const router = express.Router();
const adminService = require('../services/admin.service');
const authenticate = require('../middleware/authenticate');
const { success } = require('../utils/apiResponse');

/**
 * @swagger
 * tags:
 *   name: Categories
 *   description: Public read of admin-managed category lists (vehicle types, property categories, service categories)
 */

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get vehicle/property/service category lists — same data as /api/admin/categories, open to any authenticated user
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Category lists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 property: { type: array, items: { type: string } }
 *                 vehicle: { type: array, items: { type: string } }
 *                 service: { type: array, items: { type: string } }
 */
router.get('/', authenticate, async (req, res, next) => {
  try { return success(res, 'Categories fetched', await adminService.getCategories()); }
  catch (err) { next(err); }
});

module.exports = router;
