const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/property.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');
const isServiceProvider = require('../middleware/isServiceProvider');

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Accommodation listings and bookings
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Property:
 *       type: object
 *       properties:
 *         _id: { type: string }
 *         owner: { type: string }
 *         title: { type: string }
 *         description: { type: string }
 *         type:
 *           type: string
 *           enum: [residential, commercial]
 *         category:
 *           type: string
 *           enum: [house, lodge, apartment, office, shop]
 *         purpose:
 *           type: string
 *           enum: [rent, sale]
 *         price: { type: number }
 *         currency:
 *           type: string
 *           enum: [USD, ZWG]
 *         rooms: { type: number, nullable: true }
 *         images:
 *           type: array
 *           items: { type: string }
 *         isAvailable: { type: boolean }
 *         isApproved: { type: boolean }
 *         createdAt: { type: string, format: date-time }
 */

// ─── PayNow webhook (no auth — called by PayNow servers) ──────────────────────

/**
 * @swagger
 * /api/properties/paynow/result:
 *   post:
 *     summary: PayNow payment result webhook (called by PayNow, not clients)
 *     tags: [Properties]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Acknowledged
 */
router.post('/paynow/result', propertyController.paynowResult);

// ─── Nearby search (static before /:id) ──────────────────────────────────────

/**
 * @swagger
 * /api/properties/nearby:
 *   get:
 *     summary: Find nearby properties using GPS coordinates
 *     tags: [Properties]
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
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Properties sorted nearest-first with distanceKm field
 *       400:
 *         description: lat and lng are required
 */
router.get('/nearby', authenticate, propertyController.nearbyProperties);

// ─── Admin routes (static paths before /:id) ─────────────────────────────────

/**
 * @swagger
 * /api/properties/admin/all:
 *   get:
 *     summary: Get all properties — admin view
 *     tags: [Properties]
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
 *         schema: { type: string, enum: [true, false] }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [residential, commercial] }
 *       - in: query
 *         name: purpose
 *         schema: { type: string, enum: [rent, sale] }
 *     responses:
 *       200:
 *         description: Paginated list of all properties
 *       403:
 *         description: Admin only
 */
router.get('/admin/all', authenticate, isAdmin, propertyController.adminGetAllProperties);

// ─── Landlord routes (static paths before /:id) ───────────────────────────────

/**
 * @swagger
 * /api/properties/mine:
 *   get:
 *     summary: Get my property listings (service provider)
 *     tags: [Properties]
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
 *         description: Paginated list of own listings
 *       403:
 *         description: Service providers only
 */
router.get('/mine', authenticate, isServiceProvider, propertyController.getMyProperties);

// ─── Customer: list & create ──────────────────────────────────────────────────

/**
 * @swagger
 * /api/properties:
 *   get:
 *     summary: List all approved properties
 *     tags: [Properties]
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
 *         schema: { type: string, enum: [residential, commercial] }
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [house, lodge, apartment, office, shop] }
 *       - in: query
 *         name: purpose
 *         schema: { type: string, enum: [rent, sale] }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *         description: Case-insensitive city filter
 *     responses:
 *       200:
 *         description: Properties listed (location hidden until unlocked)
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, propertyController.listProperties);

/**
 * @swagger
 * /api/properties:
 *   post:
 *     summary: Create a new property listing (service provider)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, type, category, purpose, price]
 *             properties:
 *               title: { type: string, example: "3-Bedroom House in Borrowdale" }
 *               description: { type: string }
 *               type:
 *                 type: string
 *                 enum: [residential, commercial]
 *               category:
 *                 type: string
 *                 enum: [house, lodge, apartment, office, shop]
 *               purpose:
 *                 type: string
 *                 enum: [rent, sale]
 *               price: { type: number, example: 450 }
 *               currency:
 *                 type: string
 *                 enum: [USD, ZWG]
 *                 default: USD
 *               rooms: { type: number, example: 3 }
 *               location:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   city: { type: string, example: Harare }
 *                   lat: { type: number }
 *                   lng: { type: number }
 *               images:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       201:
 *         description: Listing created, pending admin approval
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Service providers only
 */
router.post('/', authenticate, isServiceProvider, propertyController.createProperty);

router.get('/payment-status/:reference', authenticate, propertyController.paymentStatus);

// ─── Dynamic routes: /:id must come after all static paths ───────────────────

/**
 * @swagger
 * /api/properties/{id}:
 *   get:
 *     summary: Get a single property (basic info only until unlocked)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Property details. Location and owner contact hidden unless viewUnlocked is true.
 *       404:
 *         description: Property not found
 */
router.get('/:id', authenticate, propertyController.getPropertyById);

/**
 * @swagger
 * /api/properties/{id}:
 *   put:
 *     summary: Edit a property listing (owner only)
 *     tags: [Properties]
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
 *               title: { type: string }
 *               description: { type: string }
 *               type: { type: string, enum: [residential, commercial] }
 *               category: { type: string, enum: [house, lodge, apartment, office, shop] }
 *               purpose: { type: string, enum: [rent, sale] }
 *               price: { type: number }
 *               currency: { type: string, enum: [USD, ZWG] }
 *               rooms: { type: number }
 *               isAvailable: { type: boolean }
 *               location:
 *                 type: object
 *                 properties:
 *                   address: { type: string }
 *                   city: { type: string }
 *                   lat: { type: number }
 *                   lng: { type: number }
 *               images:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Property updated (re-submitted for approval if core fields changed)
 *       403:
 *         description: Not your listing
 *       404:
 *         description: Property not found
 */
router.put('/:id', authenticate, isServiceProvider, propertyController.updateProperty);

/**
 * @swagger
 * /api/properties/{id}/request-change:
 *   put:
 *     summary: Submit a change to an already-approved property for admin review (owner only). Hides the listing until reviewed.
 *     tags: [Properties]
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
 *         description: Not your listing
 */
router.put('/:id/request-change', authenticate, isServiceProvider, propertyController.requestPropertyChange);

/**
 * @swagger
 * /api/properties/{id}/disable:
 *   put:
 *     summary: Owner-triggered disable/enable of their own property listing
 *     tags: [Properties]
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
 *         description: Not your listing
 */
router.put('/:id/disable', authenticate, isServiceProvider, propertyController.ownerDisableProperty);

/**
 * @swagger
 * /api/properties/{id}:
 *   delete:
 *     summary: Delete a property listing (owner only)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Property deleted
 *       403:
 *         description: Not your listing
 *       404:
 *         description: Property not found
 */
router.delete('/:id', authenticate, isServiceProvider, propertyController.deleteProperty);

/**
 * @swagger
 * /api/properties/{id}/approve:
 *   put:
 *     summary: Approve a property listing (admin)
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Property approved and now visible to customers
 *       403:
 *         description: Admin only
 *       404:
 *         description: Property not found
 */
router.put('/:id/approve', authenticate, isAdmin, propertyController.approveProperty);

/**
 * @swagger
 * /api/properties/{id}/unlock:
 *   post:
 *     summary: Pay to unlock full property details (customer)
 *     tags: [Properties]
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
 *                 description: Mobile number for EcoCash/OneMoney. Omit for web redirect.
 *                 example: "0771234567"
 *               method:
 *                 type: string
 *                 enum: [ecocash, onemoney, telecash, wallet]
 *                 default: ecocash
 *                 description: "wallet debits the customer's own KEBE wallet balance immediately — no gateway redirect, phone not required."
 *               email:
 *                 type: string
 *                 description: Override email for PayNow receipt
 *               promoCode:
 *                 type: string
 *                 description: >
 *                   Optional promo code to discount the unlock fee. A code covering the
 *                   full fee unlocks instantly with no payment step at all (amount: 0).
 *                 example: FREEVIEW
 *     responses:
 *       200:
 *         description: Payment initiated — follow redirectUrl or instructions to complete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bookingId: { type: string }
 *                 reference: { type: string }
 *                 pollUrl: { type: string, nullable: true }
 *                 redirectUrl: { type: string, nullable: true }
 *                 instructions: { type: string, nullable: true }
 *                 amount: { type: number }
 *                 currency: { type: string }
 *       400:
 *         description: Already unlocked
 *       404:
 *         description: Property not found
 *       502:
 *         description: Payment gateway error
 */
router.post('/:id/unlock', authenticate, propertyController.unlockProperty);

module.exports = router;
