const BookingReport = require('../models/bookingReport.model');
const VehicleBooking = require('../models/vehicleBooking.model');
const ServiceBooking = require('../models/serviceBooking.model');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');

const MODELS = { vehicle: VehicleBooking, service: ServiceBooking };
const PROVIDER_FIELD = { vehicle: 'owner', service: 'provider' };

const notifyAdmins = async (title, message) => {
  const admins = await User.find({ isAdmin: true }).select('_id');
  if (!admins.length) return;
  await Notification.insertMany(admins.map((a) => ({ recipient: a._id, title, message, type: 'system' })));
};

const createReport = async (userId, { bookingKind, bookingId, reason, description }) => {
  const Model = MODELS[bookingKind];
  if (!Model) throw { status: 400, message: 'bookingKind must be vehicle or service' };
  if (!reason) throw { status: 400, message: 'reason is required' };

  const booking = await Model.findById(bookingId);
  if (!booking) throw { status: 404, message: 'Booking not found' };

  const providerField = PROVIDER_FIELD[bookingKind];
  const isCustomer = booking.customer.toString() === userId.toString();
  const isProvider = booking[providerField]?.toString() === userId.toString();
  if (!isCustomer && !isProvider) throw { status: 403, message: 'Not a party to this booking' };

  const report = await BookingReport.create({
    bookingKind,
    booking: bookingId,
    reportedBy: userId,
    reportedRole: isCustomer ? 'customer' : 'provider',
    reason,
    description: description || null,
  });

  await notifyAdmins('New Booking Report', `A ${bookingKind} booking was reported (${reason.replace(/_/g, ' ')}) — review it in Disputes.`);
  return report;
};

const adminListReports = async ({ page = 1, limit = 20, status }) => {
  const query = {};
  if (status) query.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [reports, total] = await Promise.all([
    BookingReport.find(query)
      .populate('reportedBy', 'firstName lastName phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    BookingReport.countDocuments(query),
  ]);
  return { reports, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) } };
};

const adminResolveReport = async (reportId, { status, adminNote }) => {
  if (!['resolved', 'dismissed'].includes(status)) throw { status: 400, message: 'status must be resolved or dismissed' };
  const report = await BookingReport.findByIdAndUpdate(
    reportId,
    { status, adminNote: adminNote || null },
    { new: true }
  );
  if (!report) throw { status: 404, message: 'Report not found' };
  return report;
};

module.exports = { createReport, adminListReports, adminResolveReport };
