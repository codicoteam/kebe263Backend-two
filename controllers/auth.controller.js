const authService = require('../services/auth.service');
const { success, error } = require('../utils/apiResponse');

const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, password, roles, username } = req.body;

    if (!firstName || !lastName || !email || !phone || !password || !username) {
      return error(res, 'firstName, lastName, email, phone, password, and username are required', 400);
    }

    const result = await authService.register({ firstName, lastName, email, phone, password, roles, username });
    return success(res, result.message, { userId: result.userId }, 201);
  } catch (err) {
    next(err);
  }
};

const checkUsername = async (req, res, next) => {
  try {
    const raw = req.query.u || req.query.username;
    if (!raw) return error(res, 'Query param "u" or "username" is required', 400);

    const result = await authService.checkUsername(raw);
    return success(res, 'Checked', result);
  } catch (err) {
    next(err);
  }
};

const claimUsername = async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) return error(res, 'username is required', 400);

    const result = await authService.claimUsername(req.user._id, username);
    return success(res, 'Username claimed', result);
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return error(res, 'Email and OTP are required', 400);

    const result = await authService.verifyOtp({ email, otp });
    return success(res, 'Email verified successfully', result);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email and password are required', 400);

    const result = await authService.login({ email, password });
    return success(res, 'Login successful', result);
  } catch (err) {
    next(err);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return error(res, 'Email is required', 400);

    const result = await authService.resendOtp({ email });
    return success(res, result.message);
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return error(res, 'Email is required', 400);

    const result = await authService.forgotPassword({ email });
    return success(res, result.message);
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return error(res, 'Email, OTP, and newPassword are required', 400);
    }
    if (newPassword.length < 8) {
      return error(res, 'Password must be at least 8 characters', 400);
    }

    const result = await authService.resetPassword({ email, otp, newPassword });
    return success(res, result.message);
  } catch (err) {
    next(err);
  }
};

const requestPhoneOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return error(res, 'Phone number is required', 400);

    const result = await authService.requestPhoneOtp({ phone });
    return success(res, result.message);
  } catch (err) {
    next(err);
  }
};

const loginWithPhone = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return error(res, 'Phone number and OTP are required', 400);

    const result = await authService.loginWithPhone({ phone, otp });
    return success(res, 'Login successful', result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  verifyOtp,
  login,
  resendOtp,
  forgotPassword,
  resetPassword,
  checkUsername,
  claimUsername,
  requestPhoneOtp,
  loginWithPhone,
};
