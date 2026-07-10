const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/authenticate');
const isAdmin = require('../middleware/isAdmin');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile and admin user management
 */

// ─── Logged-in user routes ────────────────────────────────────────────────────

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile returned
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticate, userController.getMe);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     summary: Update logged-in user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               profileImage:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: No valid fields provided
 *       401:
 *         description: Unauthorized
 */
router.put('/me', authenticate, userController.updateMe);

/**
 * @swagger
 * /api/users/me/role:
 *   put:
 *     summary: Change logged-in user role between customer and serviceProvider
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [customer, serviceProvider]
 *     responses:
 *       200:
 *         description: Account role updated
 *       400:
 *         description: Invalid role or admin role change attempted
 *       401:
 *         description: Unauthorized
 */
router.put('/me/role', authenticate, userController.changeRole);

/**
 * @swagger
 * /api/users/me/change-password:
 *   put:
 *     summary: Change password for logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Missing fields or password too short
 *       401:
 *         description: Current password incorrect
 */
router.put('/me/change-password', authenticate, userController.changePassword);

// ─── FCM token routes ─────────────────────────────────────────────────────────
router.post('/me/fcm-token', authenticate, userController.registerFcmToken);
router.delete('/me/fcm-token', authenticate, userController.removeFcmToken);

// ─── Favorites ────────────────────────────────────────────────────────────────
router.get('/me/favorites', authenticate, userController.getFavorites);
router.post('/me/favorites', authenticate, userController.addFavorite);
router.delete('/me/favorites/:listingId', authenticate, userController.removeFavorite);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users by username (prefix match) for starting a chat; known contacts (shared booking history) can also be matched by real name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Matching users
 *       401:
 *         description: Unauthorized
 */
router.get('/search', authenticate, userController.searchUsers);

// ─── Admin routes ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [customer, serviceProvider]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       403:
 *         description: Admin only
 */
router.get('/', authenticate, isAdmin, userController.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a user by ID (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User returned
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate, isAdmin, userController.getUserById);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *               profileImage:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [customer, serviceProvider]
 *               isActive:
 *                 type: boolean
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
router.put('/:id', authenticate, isAdmin, userController.updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Cannot delete own account
 *       404:
 *         description: User not found
 */
router.delete('/:id', authenticate, isAdmin, userController.deleteUser);

/**
 * @swagger
 * /api/users/{id}/activate:
 *   patch:
 *     summary: Activate a user account (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activated
 *       404:
 *         description: User not found
 */
router.patch('/:id/activate', authenticate, isAdmin, userController.activateUser);

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate a user account (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 *       404:
 *         description: User not found
 */
router.patch('/:id/deactivate', authenticate, isAdmin, userController.deactivateUser);

module.exports = router;
