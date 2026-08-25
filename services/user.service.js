const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const VehicleBooking = require('../models/vehicleBooking.model');
const ServiceBooking = require('../models/serviceBooking.model');
const PropertyBooking = require('../models/propertyBooking.model');
const Property = require('../models/property.model');

const PUBLIC_SEARCH_FIELDS = 'firstName lastName username profileImage isAdmin';

// Union of every user this requester has actually transacted with (via a
// vehicle/service booking, or a property booking joined through the
// property's owner) — these are the only people allowed to be found by real
// name in search; everyone else is only reachable by username.
const getKnownContactIds = async (userId) => {
  const [vehicleBookings, serviceBookings, propertyBookings] = await Promise.all([
    VehicleBooking.find({ $or: [{ customer: userId }, { owner: userId }] }).select('customer owner'),
    ServiceBooking.find({ $or: [{ customer: userId }, { provider: userId }] }).select('customer provider'),
    PropertyBooking.find({ customer: userId }).select('customer property'),
  ]);

  const ids = new Set();
  vehicleBookings.forEach((b) => { ids.add(String(b.customer)); if (b.owner) ids.add(String(b.owner)); });
  serviceBookings.forEach((b) => { ids.add(String(b.customer)); ids.add(String(b.provider)); });

  if (propertyBookings.length) {
    const propertyIds = propertyBookings.map((b) => b.property);
    const properties = await Property.find({ _id: { $in: propertyIds } }).select('owner');
    properties.forEach((p) => { if (p.owner) ids.add(String(p.owner)); });
    propertyBookings.forEach((b) => ids.add(String(b.customer)));
  }

  ids.delete(String(userId));
  return [...ids];
};

const searchUsers = async (requesterId, rawQuery) => {
  const q = String(rawQuery || '').trim().toLowerCase();
  if (q.length < 2) return { users: [] };

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = new RegExp(`^${escaped}`, 'i');

  const [byUsername, contactIds] = await Promise.all([
    User.find({ username: prefix, isActive: true, _id: { $ne: requesterId } })
      .select(PUBLIC_SEARCH_FIELDS)
      .limit(15),
    getKnownContactIds(requesterId),
  ]);

  let byName = [];
  if (contactIds.length) {
    byName = await User.find({
      _id: { $in: contactIds },
      isActive: true,
      $or: [{ firstName: prefix }, { lastName: prefix }],
    }).select(PUBLIC_SEARCH_FIELDS).limit(15);
  }

  const contactIdSet = new Set(contactIds.map(String));
  const merged = new Map();
  [...byUsername, ...byName].forEach((u) => {
    merged.set(String(u._id), {
      _id: u._id,
      firstName: contactIdSet.has(String(u._id)) ? u.firstName : undefined,
      lastName: contactIdSet.has(String(u._id)) ? u.lastName : undefined,
      username: u.username,
      profileImage: u.profileImage,
      isAdmin: u.isAdmin,
      isKnownContact: contactIdSet.has(String(u._id)),
    });
  });

  return { users: [...merged.values()] };
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw { status: 404, message: 'User not found' };
  return user.toSafeObject();
};

const updateMe = async (userId, updates) => {
  const allowed = ['firstName', 'lastName', 'phone', 'profileImage', 'username'];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length === 0) {
    throw { status: 400, message: 'No valid fields provided to update' };
  }

  if (filtered.username !== undefined) {
    const normalized = String(filtered.username).trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalized)) {
      throw { status: 400, message: 'Username must be 3-20 characters: lowercase letters, numbers, and underscores only' };
    }
    const taken = await User.findOne({ username: normalized, _id: { $ne: userId } });
    if (taken) throw { status: 409, message: 'That username is already taken' };
    filtered.username = normalized;
    filtered.usernamePlaceholder = false;
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
      { username: { $regex: search, $options: 'i' } },
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

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const updateUser = async (id, updates) => {
  const allowed = ['firstName', 'lastName', 'phone', 'profileImage', 'roles', 'isActive', 'isVerified', 'username'];
  const filtered = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length === 0) {
    throw { status: 400, message: 'No valid fields provided to update' };
  }

  if (filtered.username !== undefined) {
    const normalized = String(filtered.username).trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalized)) {
      throw { status: 400, message: 'Username must be 3-20 characters: lowercase letters, numbers, and underscores only' };
    }
    const taken = await User.findOne({ username: normalized, _id: { $ne: id } });
    if (taken) throw { status: 409, message: 'That username is already taken' };
    filtered.username = normalized;
    filtered.usernamePlaceholder = false;
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

module.exports = { getMe, updateMe, changeRole, changePassword, getAllUsers, getUserById, updateUser, deleteUser, toggleUserStatus, searchUsers, getKnownContactIds };
