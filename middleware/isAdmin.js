const { error } = require('../utils/apiResponse');

const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return error(res, 'Access denied: admin only', 403);
  }
  next();
};

module.exports = isAdmin;
