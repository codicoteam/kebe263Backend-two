const express = require('express');
const router = express.Router();
const vehicleBookingController = require('../controllers/vehicleBooking.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');
const isServiceProvider = require('../middleware/isServiceProvider');

/**
 * @swagger
 * tags:
 *   name: VehicleBookings
 *   description: Vehicle booking lifecycle management
 */

// ─── Owner: my ride bookings ──────────────────────────────────────────────────
router.get('/mine', authenticate, isServiceProvider, vehicleBookingController.getOwnerBookings);

// ─── Customer: my ride bookings ───────────────────────────────────────────────
router.get('/customer-mine', authenticate, vehicleBookingController.getCustomerBookings);

// ─── Booking detail (parties only) ───────────────────────────────────────────
router.get('/:id', authenticate, vehicleBookingController.getBookingById);

// ─── Admin (static before /:id) ───────────────────────────────────────────────

/**
 * @swagger
 * /api/bookings/vehicle/admin/all:
 *   get:
 *     summary: Get all vehicle bookings (admin)
 *     tags: [VehicleBookings]
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
 *         description: Paginated bookings with vehicle, customer, and owner details
 *       403:
 *         description: Admin only
 */
router.get('/admin/all', authenticate, isAdmin, vehicleBookingController.adminGetAllBookings);

// ─── Booking actions ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/bookings/vehicle/{id}/accept:
 *   put:
 *     summary: Owner accepts a pending booking
 *     tags: [VehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking accepted — status changes to accepted
 *       400:
 *         description: Booking is not in pending status
 *       403:
 *         description: Not your booking
 *       404:
 *         description: Booking not found
 */
router.put('/:id/accept', authenticate, isServiceProvider, vehicleBookingController.acceptBooking);

/**
 * @swagger
 * /api/bookings/vehicle/{id}/start:
 *   put:
 *     summary: Owner starts the ride (booking must be accepted first)
 *     tags: [VehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ride started — status changes to inProgress. Driver can now emit location via socket.
 *       400:
 *         description: Booking is not in accepted status
 *       403:
 *         description: Not your booking
 *       404:
 *         description: Booking not found
 */
router.put('/:id/start', authenticate, isServiceProvider, vehicleBookingController.startRide);

/**
 * @swagger
 * /api/bookings/vehicle/{id}/complete:
 *   put:
 *     summary: Owner completes the ride — triggers platform fee deduction from wallet
 *     tags: [VehicleBookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ride completed. Platform fee deducted from owner wallet. Returns earnings breakdown.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 booking: { type: object }
 *                 platformFee: { type: number }
 *                 ownerEarnings: { type: number }
 *                 feePercent: { type: number }
 *                 walletBalance: { type: number }
 *       400:
 *         description: Booking is not in inProgress status
 *       403:
 *         description: Not your booking
 *       404:
 *         description: Booking not found
 */
router.put('/:id/complete', authenticate, isServiceProvider, vehicleBookingController.completeBooking);

/**
 * @swagger
 * /api/bookings/vehicle/{id}/cancel:
 *   put:
 *     summary: Cancel a booking (customer or owner)
 *     tags: [VehicleBookings]
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
 *         description: Booking already completed or cancelled
 *       403:
 *         description: Not your booking
 *       404:
 *         description: Booking not found
 */
router.put('/:id/cancel', authenticate, vehicleBookingController.cancelBooking);

router.put('/:id/counter-offer', authenticate, isServiceProvider, vehicleBookingController.counterOffer);
router.put('/:id/accept-counter', authenticate, vehicleBookingController.acceptCounter);
router.put('/:id/reject-counter', authenticate, vehicleBookingController.rejectCounter);

module.exports = router;
