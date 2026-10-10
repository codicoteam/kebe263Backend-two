const mongoose = require('mongoose');

// Refresh tokens are opaque random strings, never JWTs — stored here only as a
// SHA-256 hash (never the raw value) so a database leak alone can't be used to
// mint new access tokens. Rotated on every use: the old row is marked revoked
// and points at its replacement, so a reused/stolen token is detectable.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedByTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

// TTL index — Mongo sweeps the document once expiresAt passes, so expired
// (and already-rotated, since rotation extends a fresh row instead of
// mutating expiresAt) tokens don't accumulate forever.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
