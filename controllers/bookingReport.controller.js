const bookingReportService = require('../services/bookingReport.service');
const { success } = require('../utils/apiResponse');

const createReport = async (req, res, next) => {
  try {
    const report = await bookingReportService.createReport(req.user._id, req.body);
    return success(res, 'Report submitted — our team will review it', { report }, 201);
  } catch (err) { next(err); }
};

const adminListReports = async (req, res, next) => {
  try {
    const result = await bookingReportService.adminListReports(req.query);
    return success(res, 'Reports fetched', result);
  } catch (err) { next(err); }
};

const adminResolveReport = async (req, res, next) => {
  try {
    const report = await bookingReportService.adminResolveReport(req.params.id, req.body);
    return success(res, 'Report updated', { report });
  } catch (err) { next(err); }
};

module.exports = { createReport, adminListReports, adminResolveReport };
