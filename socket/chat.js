const ChatRoom = require('../models/chatRoom.model');
const ChatMessage = require('../models/chatMessage.model');

const setupChat = (chatNamespace) => {
  chatNamespace.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Personal room for offline notifications
    socket.join(`user:${userId}`);

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

    // ─── Send a message ─────────────────────────────────────────────────────
    socket.on('send:message', async ({ roomId, message }) => {
      try {
        if (!roomId || !message?.trim()) {
          return socket.emit('error', { message: 'roomId and message are required' });
        }

        const room = await ChatRoom.findById(roomId);
        if (!room) return socket.emit('error', { message: 'Room not found' });

        const isMember = room.participants.some((p) => p.toString() === userId);
        if (!isMember && !socket.user.isAdmin) {
          return socket.emit('error', { message: 'Not a participant of this room' });
        }

        const saved = await ChatMessage.create({
          room: roomId,
          sender: socket.user._id,
          message: message.trim(),
        });

        room.lastMessage = message.trim().substring(0, 100);
        room.lastMessageAt = new Date();
        await room.save();

        const payload = {
          _id: saved._id,
          roomId,
          sender: {
            _id: socket.user._id,
            firstName: socket.user.firstName,
            lastName: socket.user.lastName,
          },
          message: saved.message,
          createdAt: saved.createdAt,
        };

        // Emit to all in room including sender
        chatNamespace.to(roomId).emit('new:message', payload);

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
            preview: message.trim().substring(0, 50),
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
