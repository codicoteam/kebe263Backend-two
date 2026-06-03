const userService = require('../services/user.service');
const User = require('../models/user.model');
const { success, error } = require('../utils/apiResponse');

const getMe = async (req, res, next) => {
  try {
    const user = await userService.getMe(req.user._id);
    return success(res, 'Profile fetched successfully', { user });
  } catch (err) {
    next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateMe(req.user._id, req.body);
    return success(res, 'Profile updated successfully', { user });
  } catch (err) {
    next(err);
  }
};

const changeRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await userService.changeRole(req.user._id, role);
    return success(res, 'Account role updated successfully', { user });
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return error(res, 'currentPassword and newPassword are required', 400);
    }
    await userService.changePassword(req.user._id, { currentPassword, newPassword });
    return success(res, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

// Admin controllers
const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role, isActive } = req.query;
    const result = await userService.getAllUsers({ page, limit, search, role, isActive });
    return success(res, 'Users fetched successfully', result);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return success(res, 'User fetched successfully', { user });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return success(res, 'User updated successfully', { user });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user._id);
    return success(res, 'User deleted successfully');
  } catch (err) {
    next(err);
  }
};

const activateUser = async (req, res, next) => {
  try {
    const user = await userService.toggleUserStatus(req.params.id, true);
    return success(res, 'User activated successfully', { user });
  } catch (err) {
    next(err);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    const user = await userService.toggleUserStatus(req.params.id, false);
    return success(res, 'User deactivated successfully', { user });
  } catch (err) {
    next(err);
  }
};

const registerFcmToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return error(res, 'token is required', 400);
    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { fcmTokens: token } },
    );
    return success(res, 'FCM token registered');
  } catch (err) {
    next(err);
  }
};

const removeFcmToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return error(res, 'token is required', 400);
    await User.updateOne(
      { _id: req.user._id },
      { $pull: { fcmTokens: token } },
    );
    return success(res, 'FCM token removed');
  } catch (err) {
    next(err);
  }
};

const getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('favorites');
    return success(res, 'Favorites fetched', { favorites: user?.favorites || [] });
  } catch (err) { next(err); }
};

const addFavorite = async (req, res, next) => {
  try {
    const { listingId, listingKind } = req.body;
    if (!listingId || !listingKind) return error(res, 'listingId and listingKind required', 400);
    await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { favorites: { listingId, listingKind, addedAt: new Date() } } }
    );
    return success(res, 'Added to favorites');
  } catch (err) { next(err); }
};

const removeFavorite = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { favorites: { listingId: req.params.listingId } } }
    );
    return success(res, 'Removed from favorites');
  } catch (err) { next(err); }
};

module.exports = { getMe, updateMe, changeRole, changePassword, getAllUsers, getUserById, updateUser, deleteUser, activateUser, deactivateUser, registerFcmToken, removeFcmToken, getFavorites, addFavorite, removeFavorite };
