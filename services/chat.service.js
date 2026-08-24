const ChatRoom = require('../models/chatRoom.model');
const ChatMessage = require('../models/chatMessage.model');
const VehicleBooking = require('../models/vehicleBooking.model');
const ServiceBooking = require('../models/serviceBooking.model');
const PropertyBooking = require('../models/propertyBooking.model');
const Property = require('../models/property.model');
const User = require('../models/user.model');

const isParticipant = (room, userId) =>
  room.participants.some((p) => {
    const pId = p && typeof p === 'object' && p._id ? p._id.toString() : p.toString();
    return pId === userId.toString();
  });

// Called by booking services immediately after booking creation
const createOrGetRoomForBooking = async (bookingType, bookingId, participantIds) => {
  const existing = await ChatRoom.findOne({ bookingType, bookingId: bookingId.toString() });
  if (existing) return existing;
  return ChatRoom.create({
    bookingType,
    bookingId: bookingId.toString(),
    participants: participantIds,
    lastMessageAt: new Date(),
  });
};

// Direct (non-booking) DM between two users. Allowed pairings only:
// customer<->customer, customer<->provider, admin<->admin. Provider<->provider
// and anything touching support goes through other flows (createSupportRoom).
const getOrCreateDirectRoom = async (userId, participantId) => {
  if (!participantId) throw { status: 400, message: 'participantId is required' };
  if (String(participantId) === String(userId)) {
    throw { status: 400, message: 'Cannot start a chat with yourself' };
  }

  const [me, other] = await Promise.all([
    User.findById(userId).select('isAdmin roles'),
    User.findById(participantId).select('isAdmin roles isActive'),
  ]);
  if (!other || !other.isActive) throw { status: 404, message: 'User not found' };

  const isProvider = (u) => (u.roles || []).includes('serviceProvider');
  const bothAdmin = me.isAdmin && other.isAdmin;
  const bothProviderOnly = !me.isAdmin && !other.isAdmin && isProvider(me) && isProvider(other)
    && !(me.roles || []).includes('customer') && !(other.roles || []).includes('customer');
  const oneAdminOnly = me.isAdmin !== other.isAdmin;

  if (oneAdminOnly) {
    throw { status: 403, message: 'Use the support chat to reach an admin' };
  }
  if (!bothAdmin && bothProviderOnly) {
    throw { status: 403, message: 'Providers cannot message other providers directly' };
  }

  const bookingId = ['direct', ...[String(userId), String(participantId)].sort()].join('-');
  const existing = await ChatRoom.findOne({ bookingType: 'direct', bookingId })
    .populate('participants', 'firstName lastName username profileImage isAdmin');
  if (existing) return existing;

  const room = await ChatRoom.create({
    bookingType: 'direct',
    bookingId,
    participants: [userId, participantId],
    lastMessageAt: new Date(),
  });
  return room.populate('participants', 'firstName lastName username profileImage isAdmin');
};

// Called by REST POST /api/chat/room — looks up booking to resolve participants
const getOrCreateRoom = async (userId, { bookingType, bookingId, participantId }) => {
  if (participantId) return getOrCreateDirectRoom(userId, participantId);

  if (!['service', 'vehicle', 'property'].includes(bookingType)) {
    throw { status: 400, message: 'bookingType must be service, vehicle, or property (or pass participantId for a direct chat)' };
  }

  const existing = await ChatRoom.findOne({ bookingType, bookingId })
    .populate('participants', 'firstName lastName username profileImage isAdmin');

  if (existing) {
    const user = await User.findById(userId).select('isAdmin');
    if (!isParticipant(existing, userId) && !user.isAdmin) {
      throw { status: 403, message: 'You are not a participant of this room' };
    }
    return existing;
  }

  let participantIds = [];
  if (bookingType === 'vehicle') {
    const booking = await VehicleBooking.findById(bookingId);
    if (!booking) throw { status: 404, message: 'Vehicle booking not found' };
    participantIds = [booking.customer.toString(), booking.owner.toString()];
  } else if (bookingType === 'service') {
    const booking = await ServiceBooking.findById(bookingId);
    if (!booking) throw { status: 404, message: 'Service booking not found' };
    participantIds = [booking.customer.toString(), booking.provider.toString()];
  } else if (bookingType === 'property') {
    const booking = await PropertyBooking.findById(bookingId);
    if (!booking) throw { status: 404, message: 'Property booking not found' };
    const property = await Property.findById(booking.property).select('owner');
    if (!property) throw { status: 404, message: 'Property not found' };
    participantIds = [booking.customer.toString(), property.owner.toString()];
  }

  const user = await User.findById(userId).select('isAdmin');
  if (!participantIds.includes(userId.toString()) && !user.isAdmin) {
    throw { status: 403, message: 'You are not a party to this booking' };
  }

  const room = await ChatRoom.create({
    bookingType,
    bookingId,
    participants: participantIds,
    lastMessageAt: new Date(),
  });

  return room.populate('participants', 'firstName lastName username profileImage isAdmin');
};

const getMyRooms = async (userId) => {
  return ChatRoom.find({ participants: userId, isActive: true })
    .populate('participants', 'firstName lastName username profileImage isAdmin')
    .sort({ lastMessageAt: -1 });
};

const getRoomById = async (roomId, userId) => {
  const room = await ChatRoom.findById(roomId)
    .populate('participants', 'firstName lastName username profileImage isAdmin email');
  if (!room) throw { status: 404, message: 'Room not found' };
  const user = await User.findById(userId).select('isAdmin');
  if (!isParticipant(room, userId) && !user.isAdmin) {
    throw { status: 403, message: 'Not a participant of this room' };
  }
  return room;
};

const getRoomMessages = async (roomId, userId, { page = 1, limit = 20 }) => {
  const room = await ChatRoom.findById(roomId);
  if (!room) throw { status: 404, message: 'Room not found' };
  const user = await User.findById(userId).select('isAdmin');
  if (!isParticipant(room, userId) && !user.isAdmin) {
    throw { status: 403, message: 'Not a participant of this room' };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [messages, total] = await Promise.all([
    ChatMessage.find({ room: roomId })
      .populate('sender', 'firstName lastName username profileImage isAdmin')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ChatMessage.countDocuments({ room: roomId }),
  ]);

  await ChatMessage.updateMany(
    { room: roomId, sender: { $ne: userId }, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return {
    messages: messages.reverse(),
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
  };
};

const markRoomRead = async (roomId, userId) => {
  const room = await ChatRoom.findById(roomId).select('participants');
  if (!room) throw { status: 404, message: 'Room not found' };
  const user = await User.findById(userId).select('isAdmin');
  if (!isParticipant(room, userId) && !user.isAdmin) {
    throw { status: 403, message: 'Not a participant of this room' };
  }
  const result = await ChatMessage.updateMany(
    { room: roomId, sender: { $ne: userId }, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  return result.modifiedCount;
};

// Soft delete — isActive: false hides the room from getMyRooms for everyone.
// There's no per-participant hidden state in the schema, so this is a shared
// archive rather than "delete for me only."
const deleteRoom = async (roomId, userId) => {
  const room = await ChatRoom.findById(roomId);
  if (!room) throw { status: 404, message: 'Room not found' };
  const user = await User.findById(userId).select('isAdmin');
  if (!isParticipant(room, userId) && !user.isAdmin) {
    throw { status: 403, message: 'Not a participant of this room' };
  }
  room.isActive = false;
  await room.save();
};

const getUnreadCount = async (userId) => {
  const rooms = await ChatRoom.find({ participants: userId, isActive: true }).select('_id');
  const roomIds = rooms.map((r) => r._id);
  return ChatMessage.countDocuments({ room: { $in: roomIds }, sender: { $ne: userId }, isRead: false });
};

// `targetUserId` lets an admin open (or reuse) a support thread reaching a
// specific provider/customer — e.g. to ask a clarifying question about their
// pending listing change. The admin's message still shows as the real admin
// to other admins, and as generic "Support" to the target (frontend rule).
const createSupportRoom = async (userId, { subject, firstMessage, targetUserId, attachments, imageUrl }) => {
  const trimmedMsg = (firstMessage || '').trim();
  const hasAttachments = (attachments && attachments.length > 0) || !!imageUrl;
  if (!trimmedMsg && !hasAttachments) throw { status: 400, message: 'firstMessage or attachment is required' };

  let ownerId = userId;
  if (targetUserId && String(targetUserId) !== String(userId)) {
    const caller = await User.findById(userId).select('isAdmin');
    if (!caller?.isAdmin) throw { status: 403, message: 'Only admins can start a support thread on behalf of another user' };
    ownerId = targetUserId;
  }

  const admins = await User.find({ isAdmin: true, isActive: true }).select('_id');
  const adminIds = admins.map((a) => a._id.toString());
  const participants = [...new Set([ownerId.toString(), ...adminIds])];

  const existing = ownerId !== userId
    ? await ChatRoom.findOne({ bookingType: 'support', participants: ownerId, isActive: true }).sort({ createdAt: -1 })
    : null;

  const preview = trimmedMsg ? trimmedMsg.substring(0, 100) : '📷 Photo';

  const room = existing || await ChatRoom.create({
    bookingType: 'support',
    bookingId: `support-${ownerId}-${Date.now()}`,
    participants,
    lastMessage: preview,
    lastMessageAt: new Date(),
  });

  if (existing) {
    room.lastMessage = preview;
    room.lastMessageAt = new Date();
    await room.save();
  }

  const normalizedAttachments = Array.isArray(attachments)
    ? attachments
    : (imageUrl ? [{ url: imageUrl, type: 'image' }] : []);

  await ChatMessage.create({
    room: room._id,
    sender: userId,
    message: trimmedMsg,
    imageUrl: imageUrl || (normalizedAttachments[0]?.url) || null,
    attachments: normalizedAttachments,
  });

  return room.populate('participants', 'firstName lastName username profileImage isAdmin');
};

// Flags a room for admin attention (the "Request admin" button in a direct
// customer<->provider chat). Returns the updated room plus the current list
// of active admins so the socket layer can notify/push to them.
const requestAdmin = async (roomId, userId) => {
  const room = await ChatRoom.findById(roomId);
  if (!room) throw { status: 404, message: 'Room not found' };
  if (!isParticipant(room, userId)) {
    throw { status: 403, message: 'Not a participant of this room' };
  }
  if (room.bookingType === 'support') {
    throw { status: 400, message: 'This room already includes admins' };
  }

  room.adminRequested = true;
  room.adminRequestedBy = userId;
  room.adminRequestedAt = new Date();
  await room.save();

  const admins = await User.find({ isAdmin: true, isActive: true }).select('_id firstName lastName');
  return { room, admins };
};

// Called when an admin replies inside a flagged room — clears the flag so
// the room drops out of the "Needs Attention" queue. No-op if not flagged.
const clearAdminRequest = async (roomId) => {
  const room = await ChatRoom.findById(roomId).select('adminRequested');
  if (!room || !room.adminRequested) return false;
  room.adminRequested = false;
  await room.save();
  return true;
};

const adminGetAllRooms = async ({ page = 1, limit = 20, bookingType, isActive }) => {
  const query = {};
  if (bookingType) query.bookingType = bookingType;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [rooms, total] = await Promise.all([
    ChatRoom.find(query)
      .populate('participants', 'firstName lastName username email isAdmin')
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ChatRoom.countDocuments(query),
  ]);

  return { rooms, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

module.exports = {
  createOrGetRoomForBooking,
  getOrCreateRoom,
  getMyRooms,
  getRoomById,
  getRoomMessages,
  markRoomRead,
  deleteRoom,
  getUnreadCount,
  createSupportRoom,
  requestAdmin,
  clearAdminRequest,
  adminGetAllRooms,
};
