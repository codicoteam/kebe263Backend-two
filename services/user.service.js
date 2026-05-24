const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw { status: 404, message: 'User not found' };
  return user.toSafeObject();
};

const updateMe = async (userId, updates) => {
  const allowed = ['firstName', 'lastName', 'phone', 'profileImage'];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length === 0) {
    throw { status: 400, message: 'No valid fields provided to update' };
  }

  const user = await User.findByIdAndUpdate(userId, filtered, { new: true, runValidators: true });
  if (!user) throw { status: 404, message: 'User not found' };
  return user.toSafeObject();
};

const changeRole = async (userId, role) => {
  const allowedRoles = ['customer', 'serviceProvider'];
  if (!role || typeof role !== 'string' || !allowedRoles.includes(role)) {
    throw { status: 400, message: 'role must be one of customer or serviceProvider' };
  }

  const user = await User.findById(userId);
  if (!user) throw { status: 404, message: 'User not found' };
  if (user.isAdmin) {
    throw { status: 400, message: 'Admin users cannot change customer/serviceProvider roles' };
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { roles: [role] },
    { new: true, runValidators: false }
  );
  return updated.toSafeObject();
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw { status: 404, message: 'User not found' };

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) throw { status: 401, message: 'Current password is incorrect' };

  if (newPassword.length < 8) throw { status: 400, message: 'New password must be at least 8 characters' };

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save({ validateModifiedOnly: true });
};

// Admin operations
const getAllUsers = async ({ page = 1, limit = 20, search, role, isActive }) => {
  const query = {};

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  if (role) query.roles = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments(query),
  ]);

  return {
    users: users.map((u) => u.toSafeObject()),
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  };
};

const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw { status: 404, message: 'User not found' };
  return user.toSafeObject();
};

const updateUser = async (id, updates) => {
  const allowed = ['firstName', 'lastName', 'phone', 'profileImage', 'roles', 'isActive', 'isVerified'];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length === 0) {
    throw { status: 400, message: 'No valid fields provided to update' };
  }

  const user = await User.findByIdAndUpdate(id, filtered, { new: true, runValidators: true });
  if (!user) throw { status: 404, message: 'User not found' };
  return user.toSafeObject();
};

const deleteUser = async (id, requesterId) => {
  if (id === requesterId.toString()) throw { status: 400, message: 'You cannot delete your own account' };
  const user = await User.findByIdAndDelete(id);
  if (!user) throw { status: 404, message: 'User not found' };
};

const toggleUserStatus = async (id, isActive) => {
  const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!user) throw { status: 404, message: 'User not found' };
  return user.toSafeObject();
};

module.exports = { getMe, updateMe, changeRole, changePassword, getAllUsers, getUserById, updateUser, deleteUser, toggleUserStatus };
