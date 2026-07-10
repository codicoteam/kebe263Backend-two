// Shared change-request workflow for approved listings (vehicle/property/service).
// Each listing model has the same shape for this: { isApproved, isDisabled, pendingChange: { data, submittedAt } }.
//
// Flow: provider edits an approved listing -> requestChange stores the
// proposed fields in pendingChange and disables the live listing (hidden
// from customers) without touching its current data. Admin then either:
//   - approveChange: merges pendingChange.data into the live fields, re-enables + re-approves, clears pendingChange.
//   - rejectChange: clears pendingChange but leaves the listing disabled (provider must fix and resubmit, or contact admin).

const requestChange = async (Model, listingId, ownerId, allowedFields, data) => {
  const listing = await Model.findById(listingId);
  if (!listing) throw { status: 404, message: 'Listing not found' };
  if (listing.owner.toString() !== ownerId.toString()) {
    throw { status: 403, message: 'You can only edit your own listings' };
  }
  if (!listing.isApproved) {
    throw { status: 400, message: 'This listing is not yet approved — edit it directly instead of requesting a change' };
  }

  const proposed = {};
  for (const key of allowedFields) {
    if (data[key] !== undefined) proposed[key] = data[key];
  }
  if (Object.keys(proposed).length === 0) {
    throw { status: 400, message: 'No valid fields provided to change' };
  }

  listing.pendingChange = { data: proposed, submittedAt: new Date() };
  listing.isDisabled = true;
  await listing.save();
  return listing;
};

const approveChange = async (Model, listingId, allowedFields) => {
  const listing = await Model.findById(listingId);
  if (!listing) throw { status: 404, message: 'Listing not found' };
  if (!listing.pendingChange?.data) throw { status: 400, message: 'This listing has no pending change to approve' };

  for (const key of allowedFields) {
    if (listing.pendingChange.data[key] !== undefined) listing[key] = listing.pendingChange.data[key];
  }
  listing.pendingChange = { data: null, submittedAt: null };
  listing.isDisabled = false;
  listing.isApproved = true;
  await listing.save();
  return listing;
};

const rejectChange = async (Model, listingId) => {
  const listing = await Model.findById(listingId);
  if (!listing) throw { status: 404, message: 'Listing not found' };
  if (!listing.pendingChange?.data) throw { status: 400, message: 'This listing has no pending change to reject' };

  // Leave isDisabled = true — a rejected change means the provider's info is
  // suspect, so the listing stays hidden until they resubmit or reach out.
  listing.pendingChange = { data: null, submittedAt: null };
  await listing.save();
  return listing;
};

// Owner-triggered disable (separate from the change-request flow) — providers
// can hide their own listing at will; only admins can delete it outright.
const ownerDisable = async (Model, listingId, ownerId, disabled) => {
  const listing = await Model.findById(listingId);
  if (!listing) throw { status: 404, message: 'Listing not found' };
  if (listing.owner.toString() !== ownerId.toString()) {
    throw { status: 403, message: 'You can only manage your own listings' };
  }
  listing.isDisabled = disabled;
  await listing.save();
  return listing;
};

module.exports = { requestChange, approveChange, rejectChange, ownerDisable };
