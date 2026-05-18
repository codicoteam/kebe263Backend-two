const { error } = require('../utils/apiResponse');

const isServiceProvider = (req, res, next) => {
  if (!req.user || !req.user.roles.includes('serviceProvider')) {
    return error(res, 'Access denied: service providers only', 403);
  }
  next();
};

module.exports = isServiceProvider;
