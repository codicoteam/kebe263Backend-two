const ChatRoom = require('../models/chatRoom.model');
const ChatMessage = require('../models/chatMessage.model');
const chatService = require('../services/chat.service');
const createNotification = require('../utils/notify');

const setupChat = (chatNamespace) => {
  chatNamespace.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Personal room for offline notifications
    socket.join(`user:${userId}`);

    // All admin sockets — lets us broadcast "needs attention" events to
    // every connected admin without knowing their individual IDs upfront.
    if (socket.user.isAdmin) socket.join('admins');

    // ─── Join a chat room ───────────────────────────────────────────────────
    socket.on('join:room', async ({ roomId }) => {
      try {
        if (!roomId) return socket.emit('error', { message: 'roomId is required' });

        const room = await ChatRoom.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        const isMember = room.participants.some((p) => p.toString() === userId);
        if (!isMember && !socket.user.isAdmin) {
          return socket.emit('error', { message: 'You are not a participant of this room' });
        }

        socket.join(roomId);
        socket.emit('room:joined', { roomId, userId });
      } catch (err) {
        socket.emit('error', { message: 'Could not join room' });
      }
    });

    // ─── Request admin into a direct customer<->provider room ──────────────
    socket.on('request:admin', async ({ roomId }) => {
      try {
        if (!roomId) return socket.emit('error', { message: 'roomId is required' });

        const { room, admins } = await chatService.requestAdmin(roomId, socket.user._id);

        // Let everyone currently in the room know (shows an inline banner).
        chatNamespace.to(roomId).emit('admin:requested', {
          roomId,
          requestedBy: userId,
        });

        // Live badge/queue update for connected admin dashboards.
        chatNamespace.to('admins').emit('room:needsAdmin', {
          roomId,
          bookingType: room.bookingType,
          requestedBy: {
            _id: socket.user._id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
          },
        });

        // Offline admins still get a push/notification-center entry.
        for (const adminUser of admins) {
          createNotification(
            adminUser._id,
            'Admin requested in a chat',
            `${socket.user.firstName} ${socket.user.lastName} asked for admin help in a conversation.`,
            'alert'
          );
        }
      } catch (err) {
        socket.emit('error', { message: err.message || 'Could not request admin' });
      }
    });

    // ─── Send a message ─────────────────────────────────────────────────────
    socket.on('send:message', async ({ roomId, message, imageUrl, attachments }) => {
      try {
        const trimmedMsg = (message || '').trim();
        const hasAttachments = (attachments && attachments.length > 0) || !!imageUrl;
        if (!roomId || (!trimmedMsg && !hasAttachments)) {
          return socket.emit('error', { message: 'roomId and message or attachment are required' });
        }

        const room = await ChatRoom.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        const isMember = room.participants.some((p) => p.toString() === userId);
        if (!isMember && !socket.user.isAdmin) {
          return socket.emit('error', { message: 'Not a participant of this room' });
        }

        const normalizedAttachments = Array.isArray(attachments)
          ? attachments
          : (imageUrl ? [{ url: imageUrl, type: 'image' }] : []);

        const saved = await ChatMessage.create({
          room: roomId,
          sender: socket.user._id,
          message: trimmedMsg,
          imageUrl: imageUrl || (normalizedAttachments[0]?.url) || null,
          attachments: normalizedAttachments,
        });

        const preview = trimmedMsg ? trimmedMsg.substring(0, 100) : (normalizedAttachments.length > 0 ? '📷 Photo' : 'Message');
        room.lastMessage = preview;
        room.lastMessageAt = new Date();
        await room.save();

        const payload = {
          _id: saved._id,
          roomId,
          sender: {
            _id: socket.user._id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
            username: socket.user.username,
            profileImage: socket.user.profileImage,
            isAdmin: socket.user.isAdmin,
          },
          message: saved.message,
          imageUrl: saved.imageUrl,
          attachments: saved.attachments,
          createdAt: saved.createdAt,
        };

        // Emit to all in room including sender
        chatNamespace.to(roomId).emit('new:message', payload);

        // An admin replying to a flagged room resolves the "needs attention"
        // state — the requester never learns which admin, matching the
        // support-room convention (client renders admin messages as generic
        // "Support" regardless of room type).
        if (socket.user.isAdmin && room.adminRequested) {
          await chatService.clearAdminRequest(roomId);
          chatNamespace.to(roomId).emit('admin:joined', { roomId });
          chatNamespace.to('admins').emit('room:resolved', { roomId });
        }

        // Notify participants not currently in this room
        const socketsInRoom = await chatNamespace.in(roomId).fetchSockets();
        const onlineIds = new Set(socketsInRoom.map((s) => s.user._id.toString()));

        const offlineParticipants = room.participants.filter(
          (p) => p.toString() !== userId && !onlineIds.has(p.toString())
        );

        for (const recipientId of offlineParticipants) {
          chatNamespace.to(`user:${recipientId}`).emit('notification:message', {
            roomId,
            senderName: `${socket.user.firstName} ${socket.user.lastName}`,
            preview: preview.substring(0, 50),
            message: payload,
          });
        }
      } catch (err) {
        socket.emit('error', { message: 'Could not send message' });
      }
    });

    // ─── Typing indicators ──────────────────────────────────────────────────
    socket.on('typing:start', ({ roomId }) => {
      if (!socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('user:typing', { userId, roomId });
    });

    socket.on('typing:stop', ({ roomId }) => {
      if (!socket.rooms.has(roomId)) return;
      socket.to(roomId).emit('user:stopTyping', { userId, roomId });
    });

    // ─── Leave room ─────────────────────────────────────────────────────────
    socket.on('leave:room', ({ roomId }) => {
      if (!socket.rooms.has(roomId)) return;
      socket.leave(roomId);
      socket.to(roomId).emit('user:left', { userId, roomId });
    });

    // ─── Mark messages as read ──────────────────────────────────────────────
    socket.on('mark:read', async ({ roomId }) => {
      if (!socket.rooms.has(roomId)) {
        return socket.emit('error', { message: 'Not a participant of this room' });
      }
      try {
        await ChatMessage.updateMany(
          { room: roomId, sender: { $ne: socket.user._id }, isRead: false },
          { isRead: true, readAt: new Date() }
        );
        chatNamespace.to(roomId).emit('messages:read', { roomId, userId });
      } catch (err) {
        socket.emit('error', { message: 'Could not mark messages as read' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Chat disconnected: ${socket.id} (${socket.user.firstName})`);
    });
  });
};

module.exports = setupChat;
