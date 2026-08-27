const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');

const guard = [authenticate, isAdmin];

// Only the public submit endpoint needs spam protection — admin management
// routes below must not be capped by the same low ceiling.
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many messages sent, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * tags:
 *   name: Contact
 *   description: Public contact form submissions and admin message management
 */

/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Submit a contact form message (no account required)
 *     tags: [Contact]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, subject, message]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Takudzwa Moyo
 *               email:
 *                 type: string
 *                 format: email
 *                 example: takudzwa@example.co.zw
 *               phone:
 *                 type: string
 *                 example: "+263771234567"
 *               subject:
 *                 type: string
 *                 example: Question about listing a property
 *               message:
 *                 type: string
 *                 example: I'd like to know how to list my guest house on KEBE263.
 *     responses:
 *       201:
 *         description: Message submitted successfully
 *       400:
 *         description: Missing or invalid fields
 *       500:
 *         description: Internal server error
 */
router.post('/', submitLimiter, contactController.submitContact);

/**
 * @swagger
 * /api/contact/admin:
 *   get:
 *     summary: List contact messages (admin)
 *     tags: [Contact]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [new, read, responded, archived] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Messages fetched
 *       403:
 *         description: Admin only
 */
router.get('/admin', ...guard, contactController.getAllContacts);

/**
 * @swagger
 * /api/contact/admin/{id}:
 *   get:
 *     summary: Get a single contact message (admin)
 *     tags: [Contact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message fetched
 *       404:
 *         description: Message not found
 */
router.get('/admin/:id', ...guard, contactController.getContactById);

/**
 * @swagger
 * /api/contact/admin/{id}/read:
 *   put:
 *     summary: Mark a message as read (admin)
 *     tags: [Contact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Marked as read
 *       404:
 *         description: Message not found
 */
router.put('/admin/:id/read', ...guard, contactController.markRead);

/**
 * @swagger
 * /api/contact/admin/{id}/responded:
 *   put:
 *     summary: Mark a message as responded (admin)
 *     tags: [Contact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Marked as responded
 *       404:
 *         description: Message not found
 */
router.put('/admin/:id/responded', ...guard, contactController.markResponded);

/**
 * @swagger
 * /api/contact/admin/{id}/archive:
 *   put:
 *     summary: Archive a message (admin)
 *     tags: [Contact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message archived
 *       404:
 *         description: Message not found
 */
router.put('/admin/:id/archive', ...guard, contactController.archiveContact);

/**
 * @swagger
 * /api/contact/admin/{id}:
 *   delete:
 *     summary: Delete a message (admin)
 *     tags: [Contact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Message deleted
 *       404:
 *         description: Message not found
 */
router.delete('/admin/:id', ...guard, contactController.deleteContact);

module.exports = router;
