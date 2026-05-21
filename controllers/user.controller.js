const userService = require('../services/user.service');
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

module.exports = { getMe, updateMe, changeRole, changePassword, getAllUsers, getUserById, updateUser, deleteUser, activateUser, deactivateUser };
