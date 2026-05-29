const { error } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return error(res, 'Invalid JSON in request body. Make sure your body is valid JSON (check for missing commas, quotes, or brackets).', 400);
  }

  if (err.status) {
    return error(res, err.message, err.status, err);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return error(res, messages.join('. '), 400, err);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return error(res, `${field} already exists`, 409, err);
  }

  if (err.name === 'CastError') {
    return error(res, 'Invalid ID format', 400, err);
  }

  console.error('[Unhandled Error]', err);
  return error(res, 'Internal server error', 500, err);
};

module.exports = errorHandler;
