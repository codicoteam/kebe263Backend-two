const crypto = require('crypto');
const RefreshToken = require('../models/refreshToken.model');

const REFRESH_TOKEN_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS) || 60;

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

const expiryDate = () => new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

// Issues a brand-new refresh token for a fresh login/register/verify — returns
// the raw value (only ever sent to the client once; the DB keeps the hash).
const issueRefreshToken = async (userId) => {
  const raw = crypto.randomBytes(40).toString('hex');
  await RefreshToken.create({ user: userId, tokenHash: hashToken(raw), expiresAt: expiryDate() });
  return raw;
};

// Verifies a refresh token and rotates it: the old row is marked revoked and
// a new one is issued, so each refresh token is single-use. Returns the user
// id and the new raw refresh token for the caller to hand back to the client.
const rotateRefreshToken = async (rawToken) => {
  if (!rawToken) throw { status: 400, message: 'refreshToken is required' };

  const existing = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    throw { status: 401, message: 'Invalid or expired refresh token. Please log in again.' };
  }

  const newRaw = crypto.randomBytes(40).toString('hex');
  const newHash = hashToken(newRaw);

  existing.revokedAt = new Date();
  existing.replacedByTokenHash = newHash;
  await existing.save();

  await RefreshToken.create({ user: existing.user, tokenHash: newHash, expiresAt: expiryDate() });

  return { userId: existing.user, refreshToken: newRaw };
};

// Logout — revokes a refresh token so it can no longer be used to mint new
// access tokens. Silently no-ops on an unknown/already-revoked token so
// logout always succeeds from the client's point of view.
const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(rawToken), revokedAt: null },
    { revokedAt: new Date() }
  );
};

module.exports = { issueRefreshToken, rotateRefreshToken, revokeRefreshToken };
