const express = require('express');
const router = express.Router();
const serviceProviderController = require('../controllers/serviceProvider.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');
const isServiceProvider = require('../middleware/isServiceProvider');

/**
 * @swagger
 * tags:
 *   name: Services
 *   description: Service provider profiles, search, and bookings
 */

// ─── PayNow deposit webhook (no auth) ────────────────────────────────────────

/**
 * @swagger
 * /api/services/paynow/result:
 *   post:
 *     summary: PayNow deposit result webhook (called by PayNow, not clients)
 *     tags: [Services]
 *     security: []
 *     responses:
 *       200:
 *         description: Acknowledged
 */
router.post('/paynow/result', serviceProviderController.depositWebhook);

router.get('/deposit-status/:reference', authenticate, serviceProviderController.depositStatus);

// ─── Static paths (must come before /:id) ────────────────────────────────────

/**
 * @swagger
 * /api/services/admin/all:
 *   get:
 *     summary: Get all service profiles (admin)
 *     tags: [Services]
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
 *         name: depositPaid
 *         schema: { type: string, enum: ['true','false'] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated service profiles with owner details
 *       403:
 *         description: Admin only
 */
router.get('/admin/all', authenticate, isAdmin, serviceProviderController.adminGetAllServices);

/**
 * @swagger
 * /api/services/mine:
 *   get:
 *     summary: Get my service profiles (service provider)
 *     tags: [Services]
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
 *         description: Own service profiles
 *       403:
 *         description: Service providers only
 */
router.get('/mine', authenticate, isServiceProvider, serviceProviderController.getMyServices);

/**
 * @swagger
 * /api/services/nearby:
 *   get:
 *     summary: Find nearby service providers using GPS coordinates
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *         description: Customer latitude
 *         example: -17.8252
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *         description: Customer longitude
 *         example: 31.0335
 *       - in: query
 *         name: radius
 *         schema: { type: number, default: 10 }
 *         description: Search radius in kilometres (default 10km)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [cleaning, gardening, carpentry, plumbing, electrical, legal, painting, moving, security, tutoring, catering, other]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Providers sorted nearest-first, each with distanceKm field
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 services:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       businessName: { type: string }
 *                       category: { type: string }
 *                       estimatedPrice: { type: number }
 *                       rating: { type: number }
 *                       distanceKm:
 *                         type: number
 *                         description: Distance from the queried coordinates in kilometres
 *                         example: 2.3
 *                 pagination:
 *                   type: object
 *       400:
 *         description: lat and lng are required
 *       401:
 *         description: Unauthorized
 */
router.get('/nearby', authenticate, serviceProviderController.nearbyServices);

// ─── Collection routes ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/services:
 *   get:
 *     summary: Browse all approved live service providers
 *     tags: [Services]
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
 *         name: category
 *         schema: { type: string, enum: [cleaning, gardening, carpentry, plumbing, electrical, legal, painting, moving, security, tutoring, catering, other] }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: currency
 *         schema: { type: string, enum: [USD, ZWG] }
 *     responses:
 *       200:
 *         description: Service providers sorted by rating
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, serviceProviderController.listServices);

/**
 * @swagger
 * /api/services:
 *   post:
 *     summary: Create a service profile (service provider)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [businessName, category, description, estimatedPrice]
 *             properties:
 *               businessName: { type: string, example: "Harare Pro Plumbers" }
 *               category:
 *                 type: string
 *                 enum: [cleaning, gardening, carpentry, plumbing, electrical, legal, painting, moving, security, tutoring, catering, other]
 *               description: { type: string }
 *               estimatedPrice: { type: number, example: 30 }
 *               currency: { type: string, enum: [USD, ZWG], default: USD }
 *               priceUnit:
 *                 type: string
 *                 enum: [perHour, perDay, perJob, negotiable]
 *                 default: perJob
 *               profileImage: { type: string, description: URL }
 *               portfolioImages:
 *                 type: array
 *                 items: { type: string }
 *               location:
 *                 type: object
 *                 properties:
 *                   city: { type: string, example: Harare }
 *                   address: { type: string }
 *                   lat: { type: number, example: -17.8252 }
 *                   lng: { type: number, example: 31.0335 }
 *     responses:
 *       201:
 *         description: Profile created — pay deposit to go live
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Service providers only
 */
router.post('/', authenticate, isServiceProvider, serviceProviderController.createService);

// ─── Dynamic routes /:id (after all static paths) ────────────────────────────

/**
 * @swagger
 * /api/services/{id}:
 *   get:
 *     summary: Get a service provider's full profile
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: lat
 *         schema: { type: number }
 *         description: Optional — include distanceKm in response
 *       - in: query
 *         name: lng
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Service profile. distanceKm included if lat/lng provided.
 *       404:
 *         description: Service not found
 */
router.get('/:id', authenticate, serviceProviderController.getServiceById);

/**
 * @swagger
 * /api/services/{id}:
 *   put:
 *     summary: Edit a service profile (owner only)
 *     tags: [Services]
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
 *               businessName: { type: string }
 *               category: { type: string }
 *               description: { type: string }
 *               estimatedPrice: { type: number }
 *               currency: { type: string, enum: [USD, ZWG] }
 *               priceUnit: { type: string, enum: [perHour, perDay, perJob, negotiable] }
 *               profileImage: { type: string }
 *               portfolioImages: { type: array, items: { type: string } }
 *               isAvailable: { type: boolean }
 *               location:
 *                 type: object
 *                 properties:
 *                   city: { type: string }
 *                   address: { type: string }
 *                   lat: { type: number }
 *                   lng: { type: number }
 *     responses:
 *       200:
 *         description: Service updated (re-queued for approval if core fields changed)
 *       403:
 *         description: Not your service
 *       404:
 *         description: Service not found
 */
router.put('/:id', authenticate, isServiceProvider, serviceProviderController.updateService);

/**
 * @swagger
 * /api/services/{id}:
 *   delete:
 *     summary: Delete a service profile (owner only)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Service deleted
 *       403:
 *         description: Not your service
 *       404:
 *         description: Service not found
 */
router.delete('/:id', authenticate, isServiceProvider, serviceProviderController.deleteService);

/**
 * @swagger
 * /api/services/{id}/approve:
 *   put:
 *     summary: Approve a service profile (admin)
 *     tags: [Services]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Service approved
 *       403:
 *         description: Admin only
 *       404:
 *         description: Service not found
 */
router.put('/:id/approve', authenticate, isAdmin, serviceProviderController.approveService);

/**
 * @swagger
 * /api/services/{id}/pay-deposit:
 *   post:
 *     summary: Pay deposit via PayNow to activate service profile
 *     tags: [Services]
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
 *               phone:
 *                 type: string
 *                 description: Mobile number for EcoCash. Omit for web redirect.
 *                 example: "0771111111"
 *               method:
 *                 type: string
 *                 enum: [ecocash, onemoney, telecash]
 *                 default: ecocash
 *     responses:
 *       200:
 *         description: Deposit payment initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reference: { type: string }
 *                 pollUrl: { type: string, nullable: true }
 *                 redirectUrl: { type: string, nullable: true }
 *                 instructions: { type: string, nullable: true }
 *                 amount: { type: number }
 *                 currency: { type: string }
 *       400:
 *         description: Deposit already paid
 *       403:
 *         description: Not your service
 *       502:
 *         description: PayNow gateway error
 */
router.post('/:id/pay-deposit', authenticate, isServiceProvider, serviceProviderController.payDeposit);

/**
 * @swagger
 * /api/services/{id}/book:
 *   post:
 *     summary: Book a service provider (customer)
 *     tags: [Services]
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
 *             required: [agreedPrice]
 *             properties:
 *               agreedPrice: { type: number, example: 25 }
 *               currency: { type: string, enum: [USD, ZWG], default: USD }
 *               description: { type: string, example: "Need full house cleaning, 3 bedrooms" }
 *               scheduledDate: { type: string, format: date-time }
 *               serviceType:
 *                 type: string
 *                 enum: [provider_comes_to_me, i_go_to_provider]
 *                 default: provider_comes_to_me
 *                 description: Whether provider travels to customer or customer goes to provider
 *               location:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   city: { type: string }
 *                   lat: { type: number, description: "Customer latitude (required when serviceType is provider_comes_to_me)" }
 *                   lng: { type: number, description: "Customer longitude (required when serviceType is provider_comes_to_me)" }
 *     responses:
 *       201:
 *         description: Booking request sent to provider
 *       404:
 *         description: Service not found or unavailable
 *       409:
 *         description: Provider currently unavailable
 */
router.post('/:id/book', authenticate, serviceProviderController.bookService);

module.exports = router;
