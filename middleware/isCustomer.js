const { error } = require('../utils/apiResponse');

const isCustomer = (req, res, next) => {
  if (!req.user || !req.user.roles.includes('customer')) {
    return error(res, 'Access denied: customers only', 403);
  }
  next();
};

module.exports = isCustomer;
