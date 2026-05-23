const nodemailer = require('nodemailer');
const dns = require('dns');
const { promisify } = require('util');
const resolve4 = promisify(dns.resolve4);

const validateEmailConfig = () => {
  const required = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing SMTP configuration: ${missing.join(', ')}. Update your .env file.`);
  }
};

const createTransporter = async () => {
  validateEmailConfig();
  const transportOptions = {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  };

  // Optional: force IPv4 DNS lookups when the environment can't reach IPv6 addresses.
  if (process.env.EMAIL_FORCE_IPV4 === 'true') {
    // Prefer resolving the IPv4 address and using it directly to avoid any IPv6 attempts.
    try {
      const addresses = await resolve4(process.env.EMAIL_HOST || 'smtp.gmail.com');
      if (Array.isArray(addresses) && addresses.length) {
        transportOptions.host = addresses[0];
        // also provide a lookup fallback to be safe
        transportOptions.lookup = (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback);
      }
    } catch (err) {
      // If resolution fails, fall back to lookup-only approach.
      transportOptions.lookup = (hostname, options, callback) => dns.lookup(hostname, { family: 4 }, callback);
    }
  }

  return nodemailer.createTransport(transportOptions);
};

const sendEmail = async ({ to, subject, html }) => {
  if (process.env.EMAIL_TEST_MODE === 'true') {
    console.log('[EMAIL TEST MODE] to:', to);
    console.log('[EMAIL TEST MODE] subject:', subject);
    console.log('[EMAIL TEST MODE] html:', html);
    return { test: true };
  }

  const transporter = await createTransporter();

  if (process.env.EMAIL_FORCE_IPV4 === 'true') {
    console.log('[EMAIL] EMAIL_FORCE_IPV4=true — using IPv4 transport host:', transporter.options && transporter.options.host);
  }

  console.log('[EMAIL] Transport config:', {
    host: transporter.options?.host,
    port: transporter.options?.port,
    secure: transporter.options?.secure,
    user: transporter.options?.auth?.user || 'none',
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'kebe263 Super App <noreply@kebe263.co.zw>',
    to,
    subject,
    html,
  };

  try {
    console.log('[EMAIL] Attempting to send email to:', to);
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Email sent successfully:', info.messageId);
    return info;
  } catch (err) {
    const details = err.response || err.message || String(err);
    console.error('[EMAIL] Send failed:', {
      code: err.code,
      message: err.message,
      response: err.response,
    });
    throw new Error(`Email delivery failed. Check SMTP credentials and Gmail settings. ${details}`);
  }
};

const otpEmailTemplate = (otp, purpose = 'verification') => {
  const purposeMap = {
    verification: 'verify your email address',
    'password-reset': 'reset your password',
  };
  const actionText = purposeMap[purpose] || 'complete your request';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #FFD700; margin: 0;">kebe263</h1>
        <p style="color: #ffffff; margin: 5px 0 0;">kebe263 Super App</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px; color: #333;">Your one-time password to <strong>${actionText}</strong>:</p>
        <div style="background: #1a1a2e; color: #FFD700; font-size: 36px; font-weight: bold;
                    text-align: center; padding: 20px; border-radius: 8px; letter-spacing: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in <strong>${process.env.OTP_EXPIRY_MINUTES || 10} minutes</strong>.</p>
        <p style="color: #666; font-size: 14px;">If you did not request this, please ignore this email.</p>
      </div>
    </div>
  `;
};

module.exports = { sendEmail, otpEmailTemplate };
