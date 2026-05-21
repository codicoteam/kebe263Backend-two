const nodemailer = require('nodemailer');

const validateEmailConfig = () => {
  const required = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing SMTP configuration: ${missing.join(', ')}. Update your .env file.`);
  }
};

const createTransporter = () => {
  validateEmailConfig();
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  if (process.env.EMAIL_TEST_MODE === 'true') {
    console.log('[EMAIL TEST MODE] to:', to);
    console.log('[EMAIL TEST MODE] subject:', subject);
    console.log('[EMAIL TEST MODE] html:', html);
    return { test: true };
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'kebe263 Super App <noreply@kebe263.co.zw>',
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    const details = err.response || err.message || String(err);
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
