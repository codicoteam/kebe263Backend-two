const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const ListingReview = require('../models/listingReview.model');
const ServiceReview = require('../models/serviceReview.model');
const { success, error } = require('../utils/apiResponse');

// POST /api/reviews — create a vehicle or accommodation review
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { listingId, listingKind, bookingId, rating, comment } = req.body;
    if (!listingId || !listingKind || !rating) return error(res, 'listingId, listingKind and rating are required', 400);
    if (!['vehicle', 'accommodation'].includes(listingKind)) return error(res, 'listingKind must be vehicle or accommodation', 400);

    const existing = await ListingReview.findOne({ listingId, customer: req.user._id });
    if (existing) return error(res, 'You have already reviewed this listing', 409);

    const review = await ListingReview.create({
      listingId, listingKind, bookingId: bookingId || null,
      customer: req.user._id, rating: Math.round(Number(rating)), comment: comment || null,
    });
    await review.populate('customer', 'firstName lastName');
    return success(res, 'Review submitted', { review }, 201);
  } catch (err) { next(err); }
});

// GET /api/reviews/listing/:listingId?kind=vehicle|accommodation — public
router.get('/listing/:listingId', async (req, res, next) => {
  try {
    const { kind } = req.query;
    if (!kind || !['vehicle', 'accommodation'].includes(kind)) return error(res, 'kind must be vehicle or accommodation', 400);
    const reviews = await ListingReview.find({ listingId: req.params.listingId, listingKind: kind })
      .populate('customer', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);
    const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
    return success(res, 'Reviews fetched', { reviews, total: reviews.length, avgRating: avg ? Number(avg) : null });
  } catch (err) { next(err); }
});

// GET /api/reviews/service/:serviceId — public; fetches ServiceReview records for a provider
router.get('/service/:serviceId', async (req, res, next) => {
  try {
    const ServiceProvider = require('../models/serviceProvider.model');
    const service = await ServiceProvider.findById(req.params.serviceId).select('owner');
    if (!service) return error(res, 'Service not found', 404);
    const reviews = await ServiceReview.find({ provider: service.owner })
      .populate('customer', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);
    const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
    return success(res, 'Reviews fetched', { reviews, total: reviews.length, avgRating: avg ? Number(avg) : null });
  } catch (err) { next(err); }
});

// GET /api/reviews/my/:listingId?kind= — check if authenticated user already reviewed
router.get('/my/:listingId', authenticate, async (req, res, next) => {
  try {
    const { kind } = req.query;
    const review = await ListingReview.findOne({ listingId: req.params.listingId, customer: req.user._id, listingKind: kind });
    return success(res, 'Check done', { reviewed: !!review, review: review || null });
  } catch (err) { next(err); }
});

module.exports = router;
