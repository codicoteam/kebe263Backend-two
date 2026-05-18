const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const socketAuth = async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) return next(new Error('Authentication token required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('User not found'));
    if (!user.isActive) return next(new Error('Account is deactivated'));
    socket.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(new Error('Session expired. Please log in again.'));
    next(new Error('Invalid token'));
  }
};

module.exports = socketAuth;
