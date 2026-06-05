const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promoCode.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');

const guard = [authenticate, isAdmin];

/**
 * @swagger
 * tags:
 *   name: PromoCodes
 *   description: >
 *     Promo code management for admins and customers.
 *
 *     **How promo codes work:**
 *     1. Admin creates a promo code via `POST /api/admin/promo-codes`
 *     2. Optionally, admin assigns it to specific users via `POST /api/admin/promo-codes/:id/assign` — the user receives an in-app notification
 *     3. Customer validates the code before booking via `POST /api/promo-codes/validate`
 *     4. Customer passes `promoCode` in the booking request body (service or vehicle booking)
 *     5. The discount is applied automatically — `discountAmount` deducted from `agreedPrice`
 *     6. Customer can view all their available and used codes at `GET /api/promo-codes/mine`
 */

// ─── Admin: Promo Code CRUD ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/promo-codes:
 *   post:
 *     summary: Create a new promo code
 *     description: >
 *       Creates a promo code. Supports two discount types:
 *       - **percent** — Deducts a percentage from the booking price (e.g. 20% off)
 *       - **fixed** — Deducts a fixed dollar amount (e.g. $5 off)
 *
 *       If `assignedTo` user IDs are included, each user receives a push notification.
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME20
 *                 description: Unique promo code (3-20 alphanumeric chars, auto-uppercased)
 *               description:
 *                 type: string
 *                 example: 20% off your first service booking
 *               discountType:
 *                 type: string
 *                 enum: [percent, fixed]
 *                 default: percent
 *                 description: "percent = % off agreedPrice; fixed = flat $ amount off"
 *               discountPercent:
 *                 type: number
 *                 example: 20
 *                 description: Required when discountType is percent (1-100)
 *               discountAmount:
 *                 type: number
 *                 example: 5
 *                 description: Required when discountType is fixed — dollar amount to deduct
 *               minBookingAmount:
 *                 type: number
 *                 example: 10
 *                 description: Minimum booking price before the promo can be applied
 *               maxUses:
 *                 type: number
 *                 nullable: true
 *                 example: 100
 *                 description: Total times the code can be used across all users (null = unlimited)
 *               maxUsesPerUser:
 *                 type: number
 *                 example: 1
 *                 description: How many times a single user can apply this code
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-12-31T23:59:59Z"
 *               applicableTo:
 *                 type: string
 *                 enum: [all, vehicle, service, property]
 *                 default: all
 *                 description: Which booking type the code applies to
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional list of user IDs to pre-assign. Each user gets a push notification.
 *                 example: ["userId1", "userId2"]
 *           examples:
 *             percentOff:
 *               summary: 20% off service bookings
 *               value:
 *                 code: SERVICE20
 *                 description: "20% off any service booking"
 *                 discountType: percent
 *                 discountPercent: 20
 *                 applicableTo: service
 *                 maxUses: 50
 *                 maxUsesPerUser: 1
 *                 expiresAt: "2026-12-31T23:59:59Z"
 *             fixedDiscount:
 *               summary: $5 flat off vehicle rides
 *               value:
 *                 code: RIDE5OFF
 *                 description: "$5 off your next vehicle ride"
 *                 discountType: fixed
 *                 discountAmount: 5
 *                 minBookingAmount: 15
 *                 applicableTo: vehicle
 *                 maxUsesPerUser: 1
 *             assignedToUser:
 *               summary: Assign 30% off code to specific users
 *               value:
 *                 code: VIP30
 *                 description: "VIP 30% off — all services"
 *                 discountType: percent
 *                 discountPercent: 30
 *                 applicableTo: all
 *                 assignedTo: ["60a7c9b2e4b0f33a2c8d1234"]
 *     responses:
 *       201:
 *         description: Promo code created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       409:
 *         description: Code already exists
 */
router.post('/admin/promo-codes', ...guard, promoController.createPromoCode);

/**
 * @swagger
 * /api/admin/promo-codes:
 *   get:
 *     summary: List all promo codes (paginated)
 *     tags: [PromoCodes]
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
 *         name: isActive
 *         schema: { type: string, enum: ["true","false"] }
 *         description: Filter by active/inactive status
 *       - in: query
 *         name: applicableTo
 *         schema: { type: string, enum: [all, vehicle, service, property] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by code prefix
 *     responses:
 *       200:
 *         description: Paginated promo codes with usage stats
 */
router.get('/admin/promo-codes', ...guard, promoController.getAllPromoCodes);

/**
 * @swagger
 * /api/admin/promo-codes/{id}:
 *   get:
 *     summary: Get a single promo code with full usage history
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Promo code details with usedBy list
 *       404:
 *         description: Not found
 */
router.get('/admin/promo-codes/:id', ...guard, promoController.getPromoById);

/**
 * @swagger
 * /api/admin/promo-codes/{id}:
 *   put:
 *     summary: Update a promo code
 *     description: >
 *       Update any field of a promo code. You can enable/disable it (`isActive`),
 *       change the expiry, adjust the discount, or update applicable service type.
 *     tags: [PromoCodes]
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
 *             properties:
 *               description: { type: string }
 *               discountType: { type: string, enum: [percent, fixed] }
 *               discountPercent: { type: number }
 *               discountAmount: { type: number }
 *               minBookingAmount: { type: number }
 *               maxUses: { type: number, nullable: true }
 *               maxUsesPerUser: { type: number }
 *               expiresAt: { type: string, format: date-time, nullable: true }
 *               isActive: { type: boolean }
 *               applicableTo:
 *                 type: string
 *                 enum: [all, vehicle, service, property]
 *           examples:
 *             deactivate:
 *               summary: Deactivate a promo code
 *               value: { isActive: false }
 *             extend:
 *               summary: Extend expiry date
 *               value: { expiresAt: "2027-06-30T23:59:59Z" }
 *     responses:
 *       200:
 *         description: Promo code updated
 */
router.put('/admin/promo-codes/:id', ...guard, promoController.updatePromoCode);

/**
 * @swagger
 * /api/admin/promo-codes/{id}:
 *   delete:
 *     summary: Permanently delete a promo code
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Promo code deleted
 */
router.delete('/admin/promo-codes/:id', ...guard, promoController.deletePromoCode);

/**
 * @swagger
 * /api/admin/promo-codes/{id}/assign:
 *   post:
 *     summary: Assign a promo code to a specific user (sends push notification)
 *     description: >
 *       Adds a user to the promo code's `assignedTo` list, making it available
 *       exclusively to that user. The user receives an in-app push notification
 *       informing them of their new promo code.
 *
 *       **Use case:** Reward a specific customer with a personalised discount.
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Promo code ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user to assign the promo code to
 *                 example: "60a7c9b2e4b0f33a2c8d1234"
 *     responses:
 *       200:
 *         description: Promo code assigned and user notified via push notification
 *       404:
 *         description: Promo code not found
 *       409:
 *         description: Already assigned to this user
 */
router.post('/admin/promo-codes/:id/assign', ...guard, promoController.assignPromoCode);

// ─── Customer: Promo Code Usage ────────────────────────────────────────────────

/**
 * @swagger
 * /api/promo-codes/validate:
 *   post:
 *     summary: Validate a promo code and preview the discount
 *     description: >
 *       Check whether a promo code is valid for the current user and booking amount.
 *       Returns the computed `discountAmount` and `finalAmount` so the UI can show
 *       the savings before the customer confirms the booking.
 *
 *       **No state is changed** — the code is not marked as used. To apply the code,
 *       pass `promoCode` in the booking request body.
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, amount]
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME20
 *               amount:
 *                 type: number
 *                 example: 50
 *                 description: The agreed booking price to calculate the discount against
 *               serviceType:
 *                 type: string
 *                 enum: [all, vehicle, service, property]
 *                 default: all
 *                 description: The type of booking being made
 *     responses:
 *       200:
 *         description: Promo code is valid — returns discount details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid: { type: boolean }
 *                     promoId: { type: string }
 *                     code: { type: string }
 *                     discountType: { type: string, enum: [percent, fixed] }
 *                     discountPercent: { type: number }
 *                     discountAmount:
 *                       type: number
 *                       description: Dollar amount to be deducted from agreedPrice
 *                     originalAmount: { type: number }
 *                     finalAmount:
 *                       type: number
 *                       description: The price after discount (agreedPrice - discountAmount)
 *                     description: { type: string, nullable: true }
 *       400:
 *         description: Invalid, expired, or usage-limit-reached
 *       403:
 *         description: Code not assigned to this user
 *       404:
 *         description: Code not found
 */
router.post('/promo-codes/validate', authenticate, promoController.validatePromoCode);

/**
 * @swagger
 * /api/promo-codes/mine:
 *   get:
 *     summary: Get all promo codes available to or used by the current user
 *     description: >
 *       Returns all promo codes that are either:
 *       - Assigned to the current user
 *       - Public (no specific assignees) and currently active
 *       - Already used by the current user
 *
 *       Each code includes a `status` field: `available` or `used`.
 *     tags: [PromoCodes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of promo codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     promoCodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id: { type: string }
 *                           code: { type: string }
 *                           description: { type: string, nullable: true }
 *                           discountType: { type: string, enum: [percent, fixed] }
 *                           discountPercent: { type: number }
 *                           discountAmount: { type: number }
 *                           minBookingAmount: { type: number }
 *                           applicableTo: { type: string }
 *                           expiresAt: { type: string, format: date-time, nullable: true }
 *                           status: { type: string, enum: [available, used] }
 */
router.get('/promo-codes/mine', authenticate, promoController.getMyPromoCodes);

module.exports = router;
