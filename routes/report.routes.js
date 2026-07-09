const express = require('express');
const router = express.Router();
const bookingReportController = require('../controllers/bookingReport.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Booking dispute reports (e.g. a job marked complete before it was actually finished)
 */

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: File a dispute report against a booking (customer or provider)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingKind, bookingId, reason]
 *             properties:
 *               bookingKind: { type: string, enum: [vehicle, service] }
 *               bookingId: { type: string }
 *               reason:
 *                 type: string
 *                 enum: [completed_early, no_show, unsafe_behavior, payment_dispute, other]
 *               description: { type: string }
 *     responses:
 *       201: { description: Report submitted }
 *       403: { description: Not a party to this booking }
 *       404: { description: Booking not found }
 */
router.post('/', authenticate, bookingReportController.createReport);

/**
 * @swagger
 * /api/reports/admin/all:
 *   get:
 *     summary: List booking dispute reports (admin)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [open, resolved, dismissed] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated reports }
 */
router.get('/admin/all', authenticate, isAdmin, bookingReportController.adminListReports);

/**
 * @swagger
 * /api/reports/admin/{id}:
 *   put:
 *     summary: Resolve or dismiss a dispute report (admin)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [resolved, dismissed] }
 *               adminNote: { type: string }
 *     responses:
 *       200: { description: Report updated }
 *       404: { description: Report not found }
 */
router.put('/admin/:id', authenticate, isAdmin, bookingReportController.adminResolveReport);

module.exports = router;
