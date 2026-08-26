const { toGatewayFormat } = require('../utils/phone');

const validateSmsConfig = () => {
  const required = ['SMS_API_URL', 'SMS_API_KEY', 'SMS_SENDER_ID'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing SMS configuration: ${missing.join(', ')}. Update your .env file.`);
  }
};

const sendSms = async ({ to, message }) => {
  if (process.env.SMS_TEST_MODE === 'true') {
    console.log('[SMS TEST MODE] to:', to);
    console.log('[SMS TEST MODE] message:', message);
    return { test: true };
  }

  validateSmsConfig();

  const params = new URLSearchParams({
    apikey: process.env.SMS_API_KEY,
    mobiles: toGatewayFormat(to),
    sms: message,
    senderid: process.env.SMS_SENDER_ID,
  });

  const url = `${process.env.SMS_API_URL}?${params.toString()}`;

  let response;
  try {
    response = await fetch(url);
  } catch (err) {
    throw new Error(`SMS delivery failed: could not reach SMS gateway. ${err.message}`);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  const errorStatus = body?.status?.['error-status'];
  const errorCode = body?.status?.['error-code'];
  const isSuccess = response.ok && (errorStatus === 'Success' || errorCode === '000');

  if (!isSuccess) {
    const description = body?.status?.['error-description'] || `HTTP ${response.status}`;
    console.error('[SMS] Send failed:', { to, errorCode, errorStatus, description });
    throw new Error(`SMS delivery failed. ${description}`);
  }

  console.log('[SMS] Sent successfully to:', to);
  return body;
};

const otpSmsTemplate = (otp) => {
  const minutes = process.env.OTP_EXPIRY_MINUTES || 10;
  return `Your KEBE263 verification code is ${otp}. It expires in ${minutes} minutes. Do not share this code.`;
};

module.exports = { sendSms, otpSmsTemplate };
