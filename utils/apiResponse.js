const success = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

const error = (res, message, statusCode = 500, err = null) => {
  const payload = { success: false, message, data: null };
  if (process.env.NODE_ENV === 'development' && err) {
    payload.error = err.message || err;
  }
  return res.status(statusCode).json(payload);
};

module.exports = { success, error };
