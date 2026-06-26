const ChatRoom = require('../models/chatRoom.model');
const ChatMessage = require('../models/chatMessage.model');
const VehicleBooking = require('../models/vehicleBooking.model');
const ServiceBooking = require('../models/serviceBooking.model');
const User = require('../models/user.model');

const isParticipant = (room, userId) =>
  room.participants.some((p) => p.toString() === userId.toString());

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

// Called by REST POST /api/chat/room — looks up booking to resolve participants
const getOrCreateRoom = async (userId, { bookingType, bookingId }) => {
  if (!['service', 'vehicle', 'support'].includes(bookingType)) {
    throw { status: 400, message: 'bookingType must be service, vehicle, or support' };
  }

  const existing = await ChatRoom.findOne({ bookingType, bookingId })
    .populate('participants', 'firstName lastName profileImage');

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

  return room.populate('participants', 'firstName lastName profileImage');
};

const getMyRooms = async (userId) => {
  return ChatRoom.find({ participants: userId, isActive: true })
    .populate('participants', 'firstName lastName profileImage')
    .sort({ lastMessageAt: -1 });
};

const getRoomById = async (roomId, userId) => {
  const room = await ChatRoom.findById(roomId)
    .populate('participants', 'firstName lastName profileImage email');
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
      .populate('sender', 'firstName lastName profileImage')
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

const getUnreadCount = async (userId) => {
  const rooms = await ChatRoom.find({ participants: userId, isActive: true }).select('_id');
  const roomIds = rooms.map((r) => r._id);
  return ChatMessage.countDocuments({ room: { $in: roomIds }, sender: { $ne: userId }, isRead: false });
};

const createSupportRoom = async (userId, { subject, firstMessage }) => {
  if (!firstMessage?.trim()) throw { status: 400, message: 'firstMessage is required' };

  const admins = await User.find({ isAdmin: true, isActive: true }).select('_id');
  const adminIds = admins.map((a) => a._id.toString());
  const participants = [...new Set([userId.toString(), ...adminIds])];

  const room = await ChatRoom.create({
    bookingType: 'support',
    bookingId: `support-${userId}-${Date.now()}`,
    participants,
    lastMessage: firstMessage.trim().substring(0, 100),
    lastMessageAt: new Date(),
  });

  await ChatMessage.create({ room: room._id, sender: userId, message: firstMessage.trim() });

  return room.populate('participants', 'firstName lastName profileImage');
};

const adminGetAllRooms = async ({ page = 1, limit = 20, bookingType, isActive }) => {
  const query = {};
  if (bookingType) query.bookingType = bookingType;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [rooms, total] = await Promise.all([
    ChatRoom.find(query)
      .populate('participants', 'firstName lastName email')
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
  getUnreadCount,
  createSupportRoom,
  adminGetAllRooms,
};
