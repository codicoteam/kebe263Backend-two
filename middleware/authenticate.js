const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { error } = require('../utils/apiResponse');

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authentication token is required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return error(res, 'User not found', 401);
    if (!user.isActive) return error(res, 'Your account has been deactivated', 403);

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return error(res, 'Session expired. Please log in again.', 401);
    return error(res, 'Invalid token', 401);
  }
};

module.exports = authenticate;
