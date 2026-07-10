/**
 * =============================================================
 * SOCKET.IO — LIVE VEHICLE TRACKING EVENTS
 * =============================================================
 *
 * Connect:  io('http://localhost:8080')
 *
 * DRIVER events (emit from driver client):
 *   driver:joinBooking    { bookingId: string }
 *     → Driver joins the booking room to start sending location
 *
 *   driver:updateLocation { bookingId: string, lat: number, lng: number }
 *     → Persists location to vehicle.currentLocation in DB
 *     → Broadcasts customer:locationUpdate to the booking room
 *
 * CUSTOMER events (emit from customer client):
 *   customer:joinBooking  { bookingId: string }
 *     → Customer joins the booking room to receive location
 *
 * SERVER → CLIENT broadcasts:
 *   customer:locationUpdate  { lat: number, lng: number, updatedAt: Date }
 *     → Received by everyone in the booking room
 *
 * NOTE: Rooms are named by bookingId. Only the driver and customer
 *       of that specific booking share the room.
 * =============================================================
 */

const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');
const isServiceProvider = require('../middleware/isServiceProvider');

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle listings, bookings, and live tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Vehicle:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         owner: { type: string }
 *         make: { type: string }
 *         model: { type: string }
 *         year: { type: number }
 *         color: { type: string }
 *         plateNumber: { type: string }
 *         type:
 *           type: string
 *           enum: [sedan, suv, truck, van, motorcycle, minibus]
 *         pricePerKm: { type: number }
 *         currency: { type: string, enum: [USD, ZWG] }
 *         images: { type: array, items: { type: string } }
 *         isAvailable: { type: boolean }
 *         isApproved: { type: boolean }
 *         currentLocation:
 *           type: object
 *           properties:
 *             lat: { type: number }
 *             lng: { type: number }
 *             updatedAt: { type: string, format: date-time }
 */

// ─── Nearby search (static before /:id) ──────────────────────────────────────

/**
 * @swagger
 * /api/vehicles/nearby:
 *   get:
 *     summary: Find nearby vehicles using GPS coordinates
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *         example: -17.8252
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *         example: 31.0335
 *       - in: query
 *         name: radius
 *         schema: { type: number, default: 10 }
 *         description: Radius in kilometres
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [sedan, suv, truck, van, motorcycle, minibus] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Vehicles sorted nearest-first with distanceKm (based on currentLocation)
 *       400:
 *         description: lat and lng are required
 */
router.get('/nearby', authenticate, vehicleController.nearbyVehicles);

// ─── Static paths (must come before /:id) ────────────────────────────────────

/**
 * @swagger
 * /api/vehicles/mine:
 *   get:
 *     summary: Get my listed vehicles (service provider)
 *     tags: [Vehicles]
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
 *         description: Paginated list of own vehicles
 *       403:
 *         description: Service providers only
 */
router.get('/mine', authenticate, isServiceProvider, vehicleController.getMyVehicles);

/**
 * @swagger
 * /api/vehicles/admin/all:
 *   get:
 *     summary: Get all vehicles (admin)
 *     tags: [Vehicles]
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
 *         name: isApproved
 *         schema: { type: string, enum: ['true','false'] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [sedan, suv, truck, van, motorcycle, minibus] }
 *     responses:
 *       200:
 *         description: Paginated vehicle list with owner details
 *       403:
 *         description: Admin only
 */
router.get('/admin/all', authenticate, isAdmin, vehicleController.adminGetAllVehicles);

// ─── Collection routes ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Browse available approved vehicles
 *     tags: [Vehicles]
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
 *         name: type
 *         schema: { type: string, enum: [sedan, suv, truck, van, motorcycle, minibus] }
 *     responses:
 *       200:
 *         description: Approved available vehicles
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, vehicleController.listVehicles);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: List a vehicle for hire (service provider)
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [make, model, year, color, plateNumber, type, pricePerKm]
 *             properties:
 *               make: { type: string, example: Toyota }
 *               model: { type: string, example: Camry }
 *               year: { type: number, example: 2020 }
 *               color: { type: string, example: White }
 *               plateNumber: { type: string, example: ABZ1234 }
 *               type:
 *                 type: string
 *                 enum: [sedan, suv, truck, van, motorcycle, minibus]
 *               pricePerKm: { type: number, example: 0.5 }
 *               currency: { type: string, enum: [USD, ZWG], default: USD }
 *               images:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Vehicle listed, pending admin approval
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Service providers only
 */
router.post('/', authenticate, isServiceProvider, vehicleController.createVehicle);

// ─── Dynamic routes /:id ──────────────────────────────────────────────────────

/**
 * @swagger
 * /api/vehicles/{id}:
 *   get:
 *     summary: Get vehicle details
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vehicle details including current location
 *       404:
 *         description: Vehicle not found
 */
router.get('/:id', authenticate, vehicleController.getVehicleById);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   put:
 *     summary: Edit a vehicle listing (owner only)
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               make: { type: string }
 *               model: { type: string }
 *               year: { type: number }
 *               color: { type: string }
 *               plateNumber: { type: string }
 *               type: { type: string, enum: [sedan, suv, truck, van, motorcycle, minibus] }
 *               pricePerKm: { type: number }
 *               currency: { type: string, enum: [USD, ZWG] }
 *               isAvailable: { type: boolean }
 *               images: { type: array, items: { type: string } }
 *     responses:
 *       200:
 *         description: Vehicle updated (re-queued for approval if core fields changed)
 *       403:
 *         description: Not your vehicle
 *       404:
 *         description: Vehicle not found
 */
router.put('/:id', authenticate, isServiceProvider, vehicleController.updateVehicle);

/**
 * @swagger
 * /api/vehicles/{id}/request-change:
 *   put:
 *     summary: Submit a change to an already-approved vehicle for admin review (owner only). Hides the listing until reviewed.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Change submitted, listing disabled pending review
 *       400:
 *         description: Listing not yet approved, or no valid fields provided
 *       403:
 *         description: Not your vehicle
 */
router.put('/:id/request-change', authenticate, isServiceProvider, vehicleController.requestVehicleChange);

/**
 * @swagger
 * /api/vehicles/{id}/disable:
 *   put:
 *     summary: Owner-triggered disable/enable of their own vehicle listing
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               disabled: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: Listing disabled/enabled
 *       403:
 *         description: Not your vehicle
 */
router.put('/:id/disable', authenticate, isServiceProvider, vehicleController.ownerDisableVehicle);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle listing (owner only)
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vehicle deleted
 *       403:
 *         description: Not your vehicle
 *       404:
 *         description: Vehicle not found
 */
router.delete('/:id', authenticate, isServiceProvider, vehicleController.deleteVehicle);

/**
 * @swagger
 * /api/vehicles/{id}/approve:
 *   put:
 *     summary: Approve a vehicle listing (admin)
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Vehicle approved
 *       403:
 *         description: Admin only
 *       404:
 *         description: Vehicle not found
 */
router.put('/:id/approve', authenticate, isAdmin, vehicleController.approveVehicle);

/**
 * @swagger
 * /api/vehicles/{id}/book:
 *   post:
 *     summary: Request a vehicle booking (customer)
 *     tags: [Vehicles]
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
 *             required: [pickupLocation, dropoffLocation, agreedPrice]
 *             properties:
 *               pickupLocation:
 *                 type: object
 *                 properties:
 *                   address: { type: string, example: "cnr Samora Machel & 4th St, Harare" }
 *                   lat: { type: number, example: -17.8252 }
 *                   lng: { type: number, example: 31.0335 }
 *               dropoffLocation:
 *                 type: object
 *                 properties:
 *                   address: { type: string, example: "Borrowdale Brooke, Harare" }
 *                   lat: { type: number, example: -17.7517 }
 *                   lng: { type: number, example: 31.0609 }
 *               agreedPrice: { type: number, example: 8 }
 *               currency: { type: string, enum: [USD, ZWG], default: USD }
 *               transportReason: { type: string, example: Personal }
 *               transportItems: { type: string, example: "furniture" }
 *               promoCode:
 *                 type: string
 *                 example: RIDE5OFF
 *                 description: >
 *                   Optional promo code to discount the agreedPrice.
 *                   Validate via `POST /api/promo-codes/validate` first.
 *                   The discount is deducted from agreedPrice and the booking stores
 *                   `originalPrice`, `discountAmount`, and `promoCode`.
 *     responses:
 *       201:
 *         description: Booking request sent to owner
 *       400:
 *         description: Invalid or expired promo code
 *       404:
 *         description: Vehicle not found or unavailable
 *       409:
 *         description: Vehicle currently unavailable
 */
router.post('/:id/book', authenticate, vehicleController.bookVehicle);

module.exports = router;
