const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const generateOTP = require('../utils/generateOTP');
const generateToken = require('../utils/generateToken');
const { sendEmail, otpEmailTemplate } = require('../utils/sendEmail');
const { sendSms, otpSmsTemplate } = require('./sms.service');
const { phoneLookupCandidates } = require('../utils/phone');

const OTP_EXPIRY_MS = (Number(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000;
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const checkUsername = async (rawUsername) => {
  const username = String(rawUsername || '').trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return { available: false, reason: '3-20 characters: lowercase letters, numbers, and underscores only' };
  }
  const existing = await User.findOne({ username });
  return { available: !existing };
};

const saveAndSendOTP = async (user, purpose = 'verification') => {
  const otp = generateOTP();
  user.otp = otp;
  user.otpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save({ validateModifiedOnly: true });

  await sendEmail({
    to: user.email,
    subject: purpose === 'password-reset' ? 'KEBE Super App — Password Reset OTP' : 'KEBE Super App — Verify Your Email',
    html: otpEmailTemplate(otp, purpose),
  });

  return otp;
};

const register = async ({ firstName, lastName, email, phone, password, roles, username }) => {
  const existing = await User.findOne({ email });
  if (existing) throw { status: 409, message: 'An account with this email already exists' };

  let normalizedUsername = String(username || '').trim().toLowerCase();
  let isPlaceholder = false;

  if (!normalizedUsername) {
    // Generate a fallback placeholder username if not provided
    const base = String(email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'user';
    let candidate = base.length >= 3 ? base : `user_${base}`;
    let suffix = 0;
    while (await User.findOne({ username: candidate })) {
      suffix += 1;
      candidate = `${base.slice(0, 14)}_${suffix}`;
    }
    normalizedUsername = candidate;
    isPlaceholder = true;
  } else {
    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      throw { status: 400, message: 'Username must be 3-20 characters: lowercase letters, numbers, and underscores only' };
    }
    const usernameTaken = await User.findOne({ username: normalizedUsername });
    if (usernameTaken) throw { status: 409, message: 'That username is already taken' };
  }

  const validRoles = (roles || []).filter((r) => ['customer', 'serviceProvider'].includes(r));
  const hashed = await bcrypt.hash(password, 12);

  const user = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password: hashed,
    roles: validRoles,
    username: normalizedUsername,
    usernamePlaceholder: isPlaceholder,
  });

  await saveAndSendOTP(user, 'verification');

  return { userId: user._id, message: 'Registration successful. Check your email for the OTP.' };
};

const verifyOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email }).select('+otp +otpExpiry');
  if (!user) throw { status: 404, message: 'User not found' };
  if (user.isVerified) throw { status: 400, message: 'Email is already verified' };
  if (!user.otp || !user.otpExpiry) throw { status: 400, message: 'No OTP found. Please request a new one.' };
  if (user.otpExpiry < new Date()) throw { status: 400, message: 'OTP has expired. Please request a new one.' };
  if (user.otp !== otp) throw { status: 400, message: 'Invalid OTP' };

  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save({ validateModifiedOnly: true });

  const token = generateToken({ id: user._id, isAdmin: user.isAdmin, roles: user.roles });
  return { token, user: user.toSafeObject() };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw { status: 401, message: 'Invalid email or password' };
  if (!user.isActive) throw { status: 403, message: 'Your account has been deactivated' };
  if (!user.isVerified) throw { status: 403, message: 'Please verify your email before logging in' };

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw { status: 401, message: 'Invalid email or password' };

  const token = generateToken({ id: user._id, isAdmin: user.isAdmin, roles: user.roles });
  return { token, user: user.toSafeObject() };
};

const resendOtp = async ({ email }) => {
  const user = await User.findOne({ email });
  if (!user) throw { status: 404, message: 'User not found' };
  if (user.isVerified) throw { status: 400, message: 'Email is already verified' };

  await saveAndSendOTP(user, 'verification');
  return { message: 'A new OTP has been sent to your email' };
};

const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email });
  if (!user) throw { status: 404, message: 'No account found with this email' };

  await saveAndSendOTP(user, 'password-reset');
  return { message: 'Password reset OTP sent to your email' };
};

const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ email }).select('+otp +otpExpiry');
  if (!user) throw { status: 404, message: 'User not found' };
  if (!user.otp || !user.otpExpiry) throw { status: 400, message: 'No OTP found. Please request a new one.' };
  if (user.otpExpiry < new Date()) throw { status: 400, message: 'OTP has expired. Please request a new one.' };
  if (user.otp !== otp) throw { status: 400, message: 'Invalid OTP' };

  user.password = await bcrypt.hash(newPassword, 12);
  user.otp = undefined;
  user.otpExpiry = undefined;
  await user.save({ validateModifiedOnly: true });

  return { message: 'Password reset successfully. You can now log in.' };
};

const requestPhoneOtp = async ({ phone }) => {
  const candidates = phoneLookupCandidates(phone);
  const user = await User.findOne({ phone: { $in: candidates } });
  if (!user) {
    throw { status: 404, message: 'No account found with this phone number. Please sign up or use email login.' };
  }
  if (!user.isActive) throw { status: 403, message: 'Your account has been deactivated' };

  const otp = generateOTP();
  user.phoneOtp = otp;
  user.phoneOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save({ validateModifiedOnly: true });

  await sendSms({ to: user.phone, message: otpSmsTemplate(otp) });

  return { message: 'A verification code has been sent to your phone' };
};

const loginWithPhone = async ({ phone, otp }) => {
  const candidates = phoneLookupCandidates(phone);
  const user = await User.findOne({ phone: { $in: candidates } }).select('+phoneOtp +phoneOtpExpiry');
  if (!user) throw { status: 404, message: 'No account found with this phone number' };
  if (!user.isActive) throw { status: 403, message: 'Your account has been deactivated' };
  if (!user.phoneOtp || !user.phoneOtpExpiry) throw { status: 400, message: 'No OTP found. Please request a new one.' };
  if (user.phoneOtpExpiry < new Date()) throw { status: 400, message: 'OTP has expired. Please request a new one.' };
  if (user.phoneOtp !== otp) throw { status: 400, message: 'Invalid OTP' };

  user.isPhoneVerified = true;
  user.isVerified = true;
  user.phoneOtp = undefined;
  user.phoneOtpExpiry = undefined;
  await user.save({ validateModifiedOnly: true });

  const token = generateToken({ id: user._id, isAdmin: user.isAdmin, roles: user.roles });
  return { token, user: user.toSafeObject() };
};

const claimUsername = async (userId, rawUsername) => {
  const normalizedUsername = String(rawUsername || '').trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    throw { status: 400, message: 'Username must be 3-20 characters: lowercase letters, numbers, and underscores only' };
  }
  const usernameTaken = await User.findOne({ username: normalizedUsername, _id: { $ne: userId } });
  if (usernameTaken) throw { status: 409, message: 'That username is already taken' };

  const user = await User.findById(userId);
  if (!user) throw { status: 404, message: 'User not found' };

  user.username = normalizedUsername;
  user.usernamePlaceholder = false;
  await user.save({ validateModifiedOnly: true });

  return { user: user.toSafeObject() };
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
