const express = require('express');
const dns = require('dns');
const { promisify } = require('util');

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

module.exports = router;
