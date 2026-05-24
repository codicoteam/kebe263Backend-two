const express = require('express');
const dns = require('dns');
const { promisify } = require('util');
const User = require('../models/user.model');

const resolve4 = promisify(dns.resolve4);
const resolve6 = promisify(dns.resolve6);

const router = express.Router();

router.get('/', async (req, res) => {
  const env = {
    EMAIL_FORCE_IPV4: process.env.EMAIL_FORCE_IPV4 || null,
    EMAIL_HOST: process.env.EMAIL_HOST || null,
    EMAIL_PORT: process.env.EMAIL_PORT || null,
    EMAIL_USER: process.env.EMAIL_USER ? '***redacted***' : null,
  };

  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const dnsResult = { ipv4: null, ipv6: null, errors: [] };

  try {
    dnsResult.ipv4 = await resolve4(host);
  } catch (err) {
    dnsResult.errors.push({ v4: err.message });
  }

  try {
    dnsResult.ipv6 = await resolve6(host);
  } catch (err) {
    dnsResult.errors.push({ v6: err.message });
  }

  res.json({ success: true, env, dns: dnsResult });
});

// One-time fix: clears isAdmin on accounts that were incorrectly marked as admin.
// Protected by DEBUG_SECRET in .env.
router.post('/fix-admin-flag', async (req, res) => {
  const { email, secret } = req.body;
  if (!secret || secret !== process.env.DEBUG_SECRET) {
    return res.status(403).json({ success: false, message: 'Invalid secret' });
  }
  if (!email) {
    return res.status(400).json({ success: false, message: 'email is required' });
  }
  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    { $set: { isAdmin: false } },
    { new: true }
  );
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, message: 'isAdmin cleared', email: user.email, roles: user.roles, isAdmin: user.isAdmin });
});

module.exports = router;
