const chatService = require('../services/chat.service');
const { success } = require('../utils/apiResponse');

const getOrCreateRoom = async (req, res, next) => {
  try {
    const room = await chatService.getOrCreateRoom(req.user._id, req.body);
    return success(res, 'Chat room ready', { room }, 200);
  } catch (err) { next(err); }
};

const getMyRooms = async (req, res, next) => {
  try {
    const rooms = await chatService.getMyRooms(req.user._id);
    return success(res, 'Chat rooms fetched', { rooms });
  } catch (err) { next(err); }
};

const getRoomMessages = async (req, res, next) => {
  try {
    const result = await chatService.getRoomMessages(req.params.roomId, req.user._id, req.query);
    return success(res, 'Messages fetched', result);
  } catch (err) { next(err); }
};

const getRoomById = async (req, res, next) => {
  try {
    const room = await chatService.getRoomById(req.params.roomId, req.user._id);
    return success(res, 'Room fetched', { room });
  } catch (err) { next(err); }
};

const markRoomRead = async (req, res, next) => {
  try {
    const count = await chatService.markRoomRead(req.params.roomId, req.user._id);
    return success(res, `${count} messages marked as read`);
  } catch (err) { next(err); }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await chatService.getUnreadCount(req.user._id);
    return success(res, 'Unread count fetched', { unreadCount: count });
  } catch (err) { next(err); }
};

const createSupportRoom = async (req, res, next) => {
  try {
    const room = await chatService.createSupportRoom(req.user._id, req.body);
    return success(res, 'Support room opened', { room }, 201);
  } catch (err) { next(err); }
};

module.exports = { getOrCreateRoom, getMyRooms, getRoomMessages, getRoomById, markRoomRead, getUnreadCount, createSupportRoom };
