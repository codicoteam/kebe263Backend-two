const express = require('express');
const router = express.Router();
const serviceBookingController = require('../controllers/serviceBooking.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');
const isServiceProvider = require('../middleware/isServiceProvider');

/**
 * @swagger
 * tags:
 *   name: ServiceBookings
 *   description: Service booking lifecycle and reviews
 */

// ─── Provider: my bookings (static before /:id) ──────────────────────────────
router.get('/mine', authenticate, isServiceProvider, serviceBookingController.getMyBookings);

// ─── Customer: my bookings (static before /:id) ──────────────────────────────
router.get('/customer-mine', authenticate, serviceBookingController.getCustomerBookings);

// ─── Admin (static before /:id) ───────────────────────────────────────────────

/**
 * @swagger
 * /api/bookings/service/admin/all:
 *   get:
 *     summary: Get all service bookings (admin)
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, accepted, inProgress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Paginated bookings with service, customer, and provider details
 *       403:
 *         description: Admin only
 */
router.get('/admin/all', authenticate, isAdmin, serviceBookingController.adminGetAllBookings);

// ─── Booking actions ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/bookings/service/{id}/accept:
 *   put:
 *     summary: Provider accepts a pending booking
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Booking accepted — status changes to accepted
 *       400:
 *         description: Not in pending status
 *       403:
 *         description: Not your booking
 *       404:
 *         description: Booking not found
 */
router.put('/:id/accept', authenticate, isServiceProvider, serviceBookingController.acceptBooking);

/**
 * @swagger
 * /api/bookings/service/{id}/start:
 *   put:
 *     summary: Provider marks service as started (inProgress)
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Service started — status changes to inProgress
 *       400:
 *         description: Not in accepted status
 *       403:
 *         description: Not your booking
 *       404:
 *         description: Booking not found
 */
router.put('/:id/start', authenticate, isServiceProvider, serviceBookingController.startBooking);

/**
 * @swagger
 * /api/bookings/service/{id}/complete:
 *   put:
 *     summary: Provider completes service — triggers platform fee deduction from wallet
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Service completed with earnings breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 booking: { type: object }
 *                 platformFee: { type: number }
 *                 providerEarnings: { type: number }
 *                 feePercent: { type: number }
 *                 walletBalance: { type: number }
 *       400:
 *         description: Not in inProgress status
 *       403:
 *         description: Not your booking
 *       404:
 *         description: Booking not found
 */
router.put('/:id/complete', authenticate, isServiceProvider, serviceBookingController.completeBooking);

/**
 * @swagger
 * /api/bookings/service/{id}/cancel:
 *   put:
 *     summary: Cancel a booking (customer or provider)
 *     tags: [ServiceBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Booking cancelled
 *       400:
 *         description: Already completed or cancelled
 *       403:
 *         description: Not your booking
 *       404:
 *         description: Booking not found
 */
router.put('/:id/cancel', authenticate, serviceBookingController.cancelBooking);

/**
 * @swagger
 * /api/bookings/service/{id}/review:
 *   post:
 *     summary: Customer leaves a review after service completion
 *     tags: [ServiceBookings]
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
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               comment:
 *                 type: string
 *                 example: "Excellent work, very professional!"
 *     responses:
 *       201:
 *         description: Review saved. Provider rating recalculated.
 *       400:
 *         description: Booking not completed or rating missing
 *       403:
 *         description: Only the customer can review
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Review already submitted for this booking
 */
router.post('/:id/review', authenticate, serviceBookingController.leaveReview);

// ─── Booking detail (customer polls for SP location) ─────────────────────────
router.get('/:id', authenticate, serviceBookingController.getBookingById);

// ─── Provider location update (inProgress only) ───────────────────────────────
router.put('/:id/location', authenticate, isServiceProvider, serviceBookingController.updateLocation);

module.exports = router;
