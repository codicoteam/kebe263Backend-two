const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const authenticate = require('../middleware/authenticate');

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time chat rooms and message history
 */

// ─── Static paths before /:roomId ─────────────────────────────────────────────

/**
 * @swagger
 * /api/chat/unread-count:
 *   get:
 *     summary: Get total unread message count across all rooms
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unreadCount: { type: number }
 */
router.get('/unread-count', authenticate, chatController.getUnreadCount);

/**
 * @swagger
 * /api/chat/rooms:
 *   get:
 *     summary: Get all my chat rooms sorted by most recent message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of rooms with lastMessage preview and participants
 *
 *     description: |
 *       > **Socket.io** — See `POST /api/chat/room` for the full Socket.io integration guide.
 */
router.get('/rooms', authenticate, chatController.getMyRooms);

// ─── Create / get room ────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/chat/room:
 *   post:
 *     summary: Create or get an existing chat room for a booking
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingType, bookingId]
 *             properties:
 *               bookingType:
 *                 type: string
 *                 enum: [vehicle, service, support]
 *                 example: vehicle
 *               bookingId:
 *                 type: string
 *                 description: ID of the VehicleBooking or ServiceBooking
 *     responses:
 *       200:
 *         description: Chat room (created or retrieved). Use the returned roomId with Socket.io.
 *     description: |
 *       Creates or retrieves a chat room for a booking.
 *       After getting the roomId, use Socket.io to chat in real time.
 *
 *       ## Socket.io Integration Guide
 *
 *       ### Connection
 *       ```javascript
 *       import { io } from 'socket.io-client'
 *
 *       const socket = io('http://your-api/chat', {
 *         auth: { token: 'YOUR_JWT_TOKEN' }
 *       })
 *       ```
 *
 *       ### Step 1 — Join a room
 *       ```javascript
 *       socket.emit('join:room', { roomId: 'your-room-id' })
 *       socket.on('room:joined', ({ roomId, userId }) => {
 *         console.log('Joined room:', roomId)
 *       })
 *       ```
 *
 *       ### Step 2 — Send a message
 *       ```javascript
 *       socket.emit('send:message', { roomId, message: 'Hello!' })
 *       socket.on('new:message', (msg) => {
 *         console.log(msg.sender.firstName, msg.message)
 *       })
 *       ```
 *
 *       ### Step 3 — Typing indicators
 *       ```javascript
 *       socket.emit('typing:start', { roomId })
 *       socket.emit('typing:stop', { roomId })
 *       socket.on('user:typing', ({ userId }) => showTypingIndicator(userId))
 *       socket.on('user:stopTyping', ({ userId }) => hideTypingIndicator())
 *       ```
 *
 *       ### Step 4 — Mark as read
 *       ```javascript
 *       socket.emit('mark:read', { roomId })
 *       socket.on('messages:read', ({ roomId, userId }) => updateReadReceipts())
 *       ```
 *
 *       ### Step 5 — Offline notifications
 *       ```javascript
 *       socket.on('notification:message', ({ roomId, senderName, preview }) => {
 *         showPushNotification(`${senderName}: ${preview}`)
 *       })
 *       ```
 *
 *       ### Step 6 — Leave & errors
 *       ```javascript
 *       socket.emit('leave:room', { roomId })
 *       socket.on('user:left', ({ userId }) => updatePresence(userId))
 *       socket.on('error', ({ message }) => console.error(message))
 *       socket.on('disconnect', () => attemptReconnect())
 *       ```
 *
 *       ### Full Events Reference
 *       | Direction       | Event                | Payload                                    |
 *       |-----------------|----------------------|--------------------------------------------|
 *       | client→server   | join:room            | { roomId }                                 |
 *       | client→server   | send:message         | { roomId, message }                        |
 *       | client→server   | typing:start         | { roomId }                                 |
 *       | client→server   | typing:stop          | { roomId }                                 |
 *       | client→server   | leave:room           | { roomId }                                 |
 *       | client→server   | mark:read            | { roomId }                                 |
 *       | server→client   | room:joined          | { roomId, userId }                         |
 *       | server→client   | new:message          | { _id, roomId, sender, message, createdAt }|
 *       | server→client   | notification:message | { roomId, senderName, preview }            |
 *       | server→client   | user:typing          | { userId, roomId }                         |
 *       | server→client   | user:stopTyping      | { userId, roomId }                         |
 *       | server→client   | messages:read        | { roomId, userId }                         |
 *       | server→client   | user:left            | { userId, roomId }                         |
 *       | server→client   | error                | { message }                                |
 *
 *       ### Authentication
 *       Token is passed once via socket handshake — no need to resend on each emit.
 *       `io('/chat', { auth: { token } })` or `io('/chat?token=...')`
 */
router.post('/room', authenticate, chatController.getOrCreateRoom);

/**
 * @swagger
 * /api/chat/support:
 *   post:
 *     summary: Open a support ticket chat (auto-adds all admins)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstMessage]
 *             properties:
 *               subject:
 *                 type: string
 *                 example: "Issue with my vehicle booking"
 *               firstMessage:
 *                 type: string
 *                 example: "Hi, I have a problem with booking #ABC123"
 *     responses:
 *       201:
 *         description: Support room created with first message saved. Use roomId with Socket.io.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room:
 *                   type: object
 *                   properties:
 *                     _id: { type: string }
 *                     bookingType: { type: string, example: support }
 *                     participants: { type: array }
 *                     lastMessage: { type: string }
 *
 *     description: |
 *       > **Socket.io** — After creating the support room, join it via `join:room` and use `send:message`.
 *       > See `POST /api/chat/room` for the full Socket.io integration guide.
 */
router.post('/support', authenticate, chatController.createSupportRoom);

// ─── Room-specific routes ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/chat/rooms/{roomId}:
 *   get:
 *     summary: Get a single room's details and participants
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Room with participants populated
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Room not found
 *
 *     description: |
 *       > **Socket.io** — See `POST /api/chat/room` for the full Socket.io integration guide.
 */
router.get('/rooms/:roomId', authenticate, chatController.getRoomById);

/**
 * @swagger
 * /api/chat/rooms/{roomId}/messages:
 *   get:
 *     summary: Get paginated chat history — marks all messages as read on fetch
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated messages (chronological order) + pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       sender:
 *                         type: object
 *                         properties:
 *                           firstName: { type: string }
 *                           lastName: { type: string }
 *                       message: { type: string }
 *                       isRead: { type: boolean }
 *                       createdAt: { type: string, format: date-time }
 *                 pagination:
 *                   type: object
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Room not found
 *
 *     description: |
 *       > **Socket.io** — See `POST /api/chat/room` for the full Socket.io integration guide.
 */
router.get('/rooms/:roomId/messages', authenticate, chatController.getRoomMessages);

/**
 * @swagger
 * /api/chat/rooms/{roomId}:
 *   delete:
 *     summary: Delete (soft-archive) a chat room — hides it from both participants' room lists
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Conversation deleted
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Room not found
 */
router.delete('/rooms/:roomId', authenticate, chatController.deleteRoom);

/**
 * @swagger
 * /api/chat/rooms/{roomId}/read:
 *   put:
 *     summary: Mark all messages in a room as read via REST
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Messages marked as read
 *
 *     description: |
 *       > **Socket.io alternative** — You can also emit `mark:read` via socket for real-time receipt updates.
 *       > See `POST /api/chat/room` for the full Socket.io integration guide.
 */
router.put('/rooms/:roomId/read', authenticate, chatController.markRoomRead);

module.exports = router;
