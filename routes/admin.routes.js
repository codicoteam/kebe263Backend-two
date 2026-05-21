const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');

const guard = [authenticate, isAdmin];

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only management and analytics endpoints
 */

// ─── Platform Config ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/config:
 *   get:
 *     summary: Get all platform config values
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All config entries
 */
router.get('/config', ...guard, adminController.getConfig);

/**
 * @swagger
 * /api/admin/config:
 *   post:
 *     summary: Create a new config entry
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, value]
 *             properties:
 *               key: { type: string, example: platformFeePercent }
 *               value: { type: string, example: "10" }
 *               description: { type: string }
 *     responses:
 *       201: { description: Config created }
 *       409: { description: Key already exists }
 */
router.post('/config', ...guard, adminController.createConfig);

/**
 * @swagger
 * /api/admin/config/{key}:
 *   put:
 *     summary: Update a config value by key (upserts if not found)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema: { type: string }
 *         example: platformFeePercent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value: { type: string, example: "15" }
 *               description: { type: string }
 *     responses:
 *       200: { description: Config updated }
 */
router.put('/config/:key', ...guard, adminController.updateConfig);

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (paginated + filtered)
 *     tags: [Admin]
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
 *         name: search
 *         schema: { type: string }
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [customer, serviceProvider] }
 *       - in: query
 *         name: isActive
 *         schema: { type: string, enum: ["true","false"] }
 *     responses:
 *       200: { description: Paginated users }
 */
router.get('/users', ...guard, adminController.getUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get a single user's full profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User profile }
 *       404: { description: Not found }
 */
router.get('/users/:id', ...guard, adminController.getUser);

/**
 * @swagger
 * /api/admin/users/{id}/ban:
 *   put:
 *     summary: Toggle ban/unban a user (toggles isActive)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User banned or unbanned }
 */
router.put('/users/:id/ban', ...guard, adminController.banUser);

/**
 * @swagger
 * /api/admin/users/{id}/verify:
 *   put:
 *     summary: Manually mark a user's email as verified
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User verified }
 */
router.put('/users/:id/verify', ...guard, adminController.verifyUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Soft-delete a user (sets isActive=false)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deactivated }
 */
router.delete('/users/:id', ...guard, adminController.deleteUser);

// ─── Properties ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/properties:
 *   get:
 *     summary: Get all property listings
 *     tags: [Admin]
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
 *         schema: { type: string, enum: ["true","false"] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [residential, commercial] }
 *       - in: query
 *         name: purpose
 *         schema: { type: string, enum: [rent, sale] }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated properties }
 */
router.get('/properties', ...guard, adminController.getProperties);

/**
 * @swagger
 * /api/admin/properties/{id}/approve:
 *   put:
 *     summary: Approve a property listing — notifies owner
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Property approved }
 */
router.put('/properties/:id/approve', ...guard, adminController.approveProperty);

/**
 * @swagger
 * /api/admin/properties/{id}/reject:
 *   put:
 *     summary: Reject a property listing — notifies owner
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Property rejected }
 */
router.put('/properties/:id/reject', ...guard, adminController.rejectProperty);

/**
 * @swagger
 * /api/admin/properties/{id}:
 *   delete:
 *     summary: Permanently delete a property listing
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Property deleted }
 */
router.delete('/properties/:id', ...guard, adminController.deleteProperty);

/**
 * @swagger
 * /api/admin/bookings/property:
 *   get:
 *     summary: Get all property bookings
 *     tags: [Admin]
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
 *         name: paymentStatus
 *         schema: { type: string, enum: [pending, paid] }
 *     responses:
 *       200: { description: Paginated property bookings }
 */
router.get('/bookings/property', ...guard, adminController.getPropertyBookings);

// ─── Vehicles ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Admin]
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
 *         schema: { type: string, enum: ["true","false"] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [sedan, suv, truck, van, motorcycle, minibus] }
 *     responses:
 *       200: { description: Paginated vehicles }
 */
router.get('/vehicles', ...guard, adminController.getVehicles);

/**
 * @swagger
 * /api/admin/vehicles/{id}/approve:
 *   put:
 *     summary: Approve a vehicle listing — notifies owner
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vehicle approved }
 */
router.put('/vehicles/:id/approve', ...guard, adminController.approveVehicle);

/**
 * @swagger
 * /api/admin/vehicles/{id}/reject:
 *   put:
 *     summary: Reject a vehicle listing — notifies owner
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vehicle rejected }
 */
router.put('/vehicles/:id/reject', ...guard, adminController.rejectVehicle);

/**
 * @swagger
 * /api/admin/vehicles/{id}:
 *   delete:
 *     summary: Permanently delete a vehicle listing
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Vehicle deleted }
 */
router.delete('/vehicles/:id', ...guard, adminController.deleteVehicle);

/**
 * @swagger
 * /api/admin/bookings/vehicle:
 *   get:
 *     summary: Get all vehicle bookings
 *     tags: [Admin]
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
 *         schema: { type: string, enum: [pending, accepted, inProgress, completed, cancelled] }
 *     responses:
 *       200: { description: Paginated vehicle bookings }
 */
router.get('/bookings/vehicle', ...guard, adminController.getVehicleBookings);

/**
 * @swagger
 * /api/admin/wallets:
 *   get:
 *     summary: Get all user wallets with balances
 *     tags: [Admin]
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
 *       200: { description: All wallets with owner details }
 */
router.get('/wallets', ...guard, adminController.getWallets);

/**
 * @swagger
 * /api/admin/wallets/{userId}:
 *   get:
 *     summary: Get a specific user's wallet and transaction history
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Wallet + paginated transactions }
 *       404: { description: Wallet not found }
 */
router.get('/wallets/:userId', ...guard, adminController.getUserWallet);

// ─── Services ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/services:
 *   get:
 *     summary: Get all service profiles
 *     tags: [Admin]
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
 *         schema: { type: string, enum: ["true","false"] }
 *       - in: query
 *         name: depositPaid
 *         schema: { type: string, enum: ["true","false"] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paginated services }
 */
router.get('/services', ...guard, adminController.getServices);

/**
 * @swagger
 * /api/admin/services/{id}/approve:
 *   put:
 *     summary: Approve a service profile — notifies owner
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Service approved }
 */
router.put('/services/:id/approve', ...guard, adminController.approveService);

/**
 * @swagger
 * /api/admin/services/{id}/reject:
 *   put:
 *     summary: Reject a service profile — notifies owner
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Service rejected }
 */
router.put('/services/:id/reject', ...guard, adminController.rejectService);

/**
 * @swagger
 * /api/admin/services/{id}:
 *   delete:
 *     summary: Permanently delete a service profile
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Service deleted }
 */
router.delete('/services/:id', ...guard, adminController.deleteService);

/**
 * @swagger
 * /api/admin/bookings/service:
 *   get:
 *     summary: Get all service bookings
 *     tags: [Admin]
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
 *         schema: { type: string, enum: [pending, accepted, inProgress, completed, cancelled] }
 *     responses:
 *       200: { description: Paginated service bookings }
 */
router.get('/bookings/service', ...guard, adminController.getServiceBookings);
router.get('/bookings/services', ...guard, adminController.getServiceBookings);

// ─── Reports ──────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/reports/overview:
 *   get:
 *     summary: Platform overview — totals, active bookings, revenue, pending approvals
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overview stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers: { type: number }
 *                 totalServiceProviders: { type: number }
 *                 totalCustomers: { type: number }
 *                 totalProperties: { type: number }
 *                 totalVehicles: { type: number }
 *                 totalServices: { type: number }
 *                 activeBookings:
 *                   type: object
 *                   properties:
 *                     vehicle: { type: number }
 *                     service: { type: number }
 *                 totalRevenue:
 *                   type: object
 *                   properties:
 *                     accommodation: { type: number }
 *                     vehicle: { type: number }
 *                     service: { type: number }
 *                     overall: { type: number }
 *                 pendingApprovals:
 *                   type: object
 *                   properties:
 *                     properties: { type: number }
 *                     vehicles: { type: number }
 *                     services: { type: number }
 */
router.get('/reports/overview', ...guard, adminController.getOverview);

/**
 * @swagger
 * /api/admin/reports/revenue:
 *   get:
 *     summary: Revenue breakdown by module and by day
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         example: "2026-01-01"
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         example: "2026-12-31"
 *       - in: query
 *         name: module
 *         schema: { type: string, enum: [all, accommodation, vehicle, service], default: all }
 *     responses:
 *       200:
 *         description: Revenue by day per module with totals
 */
router.get('/reports/revenue', ...guard, adminController.getRevenueReport);

/**
 * @swagger
 * /api/admin/reports/bookings:
 *   get:
 *     summary: Booking counts and trends grouped by status and day
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, accepted, inProgress, completed, cancelled] }
 *       - in: query
 *         name: module
 *         schema: { type: string, enum: [all, accommodation, vehicle, service], default: all }
 *     responses:
 *       200:
 *         description: Booking trends by module
 */
router.get('/reports/bookings', ...guard, adminController.getBookingReport);

/**
 * @swagger
 * /api/admin/reports/users:
 *   get:
 *     summary: New user registration trends by role over time
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: User registrations grouped by day and role
 */
router.get('/reports/users', ...guard, adminController.getUserReport);

// ─── Admin Chat ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/chat/rooms:
 *   get:
 *     summary: Get all chat rooms across the platform (admin)
 *     tags: [Admin]
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
 *         name: bookingType
 *         schema: { type: string, enum: [vehicle, service, support] }
 *       - in: query
 *         name: isActive
 *         schema: { type: string, enum: ["true","false"] }
 *     responses:
 *       200:
 *         description: All chat rooms with participants. Admin can join any via Socket.io join:room event.
 */
router.get('/chat/rooms', ...guard, adminController.adminGetChatRooms);

module.exports = router;
