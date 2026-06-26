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

// ─── Pricing Rules ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/pricing:
 *   get:
 *     summary: Get all platform pricing rules
 *     description: >
 *       Returns all pricing-related configuration values managed by the admin.
 *       These keys control how platform fees are calculated across all services.
 *
 *       **Available pricing keys and how they are used:**
 *
 *       | Key | Default | Used In | Description |
 *       |-----|---------|---------|-------------|
 *       | `platformFeePercent` | `10` | All bookings | Global platform fee %. Used as fallback when service-specific fee is not set. |
 *       | `vehiclePlatformFeePercent` | falls back to `platformFeePercent` | Vehicle bookings | Override fee % for vehicle/ride bookings only. |
 *       | `servicePlatformFeePercent` | falls back to `platformFeePercent` | Service bookings | Override fee % for service provider bookings only. |
 *       | `serviceProviderDepositAmount` | `20` | Service provider registration | USD deposit required for a service provider to go live. |
 *       | `vehicleOwnerDepositAmount` | `0` | Vehicle registration | USD deposit required for vehicle owners (if applicable). |
 *       | `minBookingAmountVehicle` | `0` | Vehicle bookings | Minimum agreed price for a vehicle booking. |
 *       | `minBookingAmountService` | `0` | Service bookings | Minimum agreed price for a service booking. |
 *
 *       **How to update:** Use `PUT /api/admin/pricing/:key` with `{ "value": "15" }`.
 *       All values are stored as strings and parsed to numbers at runtime.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All pricing config entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     pricing:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           key: { type: string }
 *                           value: { type: string }
 *                           description: { type: string }
 *                           updatedAt: { type: string, format: date-time }
 */
router.get('/pricing', ...guard, adminController.getPricingRules);

/**
 * @swagger
 * /api/admin/pricing/{key}:
 *   put:
 *     summary: Update a pricing rule
 *     description: >
 *       Update any pricing configuration key. The system uses this value for all
 *       future bookings. Changes take effect within 5 minutes (config cache TTL).
 *
 *       **Common update examples:**
 *       - Set vehicle fee to 12%: `PUT /api/admin/pricing/vehiclePlatformFeePercent` → `{ "value": "12" }`
 *       - Set global fee to 15%: `PUT /api/admin/pricing/platformFeePercent` → `{ "value": "15" }`
 *       - Set service deposit to $25: `PUT /api/admin/pricing/serviceProviderDepositAmount` → `{ "value": "25" }`
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - platformFeePercent
 *             - vehiclePlatformFeePercent
 *             - servicePlatformFeePercent
 *             - serviceProviderDepositAmount
 *             - vehicleOwnerDepositAmount
 *             - minBookingAmountVehicle
 *             - minBookingAmountService
 *         example: platformFeePercent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [value]
 *             properties:
 *               value:
 *                 type: string
 *                 example: "12"
 *                 description: New value (always a string; parsed to number at runtime)
 *               description:
 *                 type: string
 *                 example: Vehicle platform commission rate
 *           examples:
 *             globalFee:
 *               summary: Set global fee to 12%
 *               value: { value: "12", description: "Global platform commission" }
 *             vehicleFee:
 *               summary: Set vehicle-specific fee to 8%
 *               value: { value: "8", description: "Vehicle ride commission" }
 *             serviceDeposit:
 *               summary: Set service provider deposit to $25
 *               value: { value: "25", description: "Service provider onboarding deposit" }
 *     responses:
 *       200:
 *         description: Pricing rule updated — changes take effect within 5 minutes
 */
router.put('/pricing/:key', ...guard, adminController.updatePricingRule);

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

/**
 * @swagger
 * /api/admin/categories:
 *   get:
 *     summary: Get admin-managed category lists for property, vehicle and service modules
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Category lists }
 */
router.get('/categories', ...guard, adminController.getCategories);

/**
 * @swagger
 * /api/admin/categories:
 *   post:
 *     summary: Add a dynamic category for properties, vehicles or services
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [entity, value]
 *             properties:
 *               entity: { type: string, enum: [property, vehicle, service] }
 *               value: { type: string }
 *               description: { type: string }
 *     responses:
 *       201: { description: Category added }
 */
router.post('/categories', ...guard, adminController.addCategory);

/**
 * @swagger
 * /api/admin/categories/{entity}/{value}:
 *   delete:
 *     summary: Delete a dynamic category for a module
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema: { type: string, enum: [property, vehicle, service] }
 *       - in: path
 *         name: value
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Category removed }
 */
router.delete('/categories/:entity/:value', ...guard, adminController.removeCategory);

/**
 * @swagger
 * /api/admin/notifications/broadcast:
 *   post:
 *     summary: Broadcast a notification to users or a specific user role
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, message]
 *             properties:
 *               title: { type: string }
 *               message: { type: string }
 *               type: { type: string, example: system }
 *               role: { type: string, enum: [customer, serviceProvider] }
 *     responses:
 *       200: { description: Notifications delivered }
 */
router.post('/notifications/broadcast', ...guard, adminController.broadcastNotifications);

/**
 * @swagger
 * /api/admin/users/{id}/kyc:
 *   put:
 *     summary: Update a user's KYC status
 *     tags: [Admin]
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
 *             required: [kycStatus]
 *             properties:
 *               kycStatus: { type: string, enum: [pending, approved, rejected] }
 *               kycComments: { type: string }
 *     responses:
 *       200: { description: KYC status updated }
 */
router.put('/users/:id/kyc', ...guard, adminController.updateKycStatus);

/**
 * @swagger
 * /api/admin/refunds/{id}:
 *   post:
 *     summary: Issue an admin refund for a paid booking
 *     tags: [Admin]
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
 *             required: [bookingType]
 *             properties:
 *               bookingType: { type: string, enum: [property, vehicle, service] }
 *               amount: { type: number }
 *               reason: { type: string }
 *     responses:
 *       200: { description: Refund processed }
 */
router.post('/refunds/:id', ...guard, adminController.processRefund);

/**
 * @swagger
 * /api/admin/locations:
 *   get:
 *     summary: Get admin dashboard locations for properties, vehicles, and service providers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Location map data }
 */
router.get('/locations', ...guard, adminController.getAdminLocations);

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
 *     summary: Permanently delete a user and all associated data (irreversible)
 *     description: >
 *       Hard-deletes the user and cascade-removes all owned properties, vehicles,
 *       service-provider profiles, bookings, wallet, transactions, notifications,
 *       chat history, and promo-code references. Admin accounts are protected and
 *       cannot be deleted via this endpoint.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User permanently deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted: { type: boolean, example: true }
 *                 userId: { type: string }
 *       403: { description: Cannot delete an admin account }
 *       404: { description: User not found }
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
