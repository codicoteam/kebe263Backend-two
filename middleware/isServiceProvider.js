const { error } = require('../utils/apiResponse');

const isServiceProvider = (req, res, next) => {
  if (!req.user) return error(res, 'Access denied: service providers only', 403);
  if (req.user.isAdmin || req.user.roles.includes('serviceProvider')) return next();
  return error(res, 'Access denied: service providers only', 403);
};

module.exports = isServiceProvider;
