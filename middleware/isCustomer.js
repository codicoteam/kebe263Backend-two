const { error } = require('../utils/apiResponse');

const isCustomer = (req, res, next) => {
  if (!req.user) return error(res, 'Access denied: customers only', 403);
  if (req.user.isAdmin || req.user.roles.includes('customer')) return next();
  return error(res, 'Access denied: customers only', 403);
};

module.exports = isCustomer;
