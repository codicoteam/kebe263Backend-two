const admin = require('firebase-admin');

if (!admin.apps.length) {
  const missing = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'].filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    console.error(`[Firebase] Missing env vars: ${missing.join(', ')} — push notifications are disabled`);
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    } catch (err) {
      console.error(`[Firebase] Initialization failed — push notifications are disabled: ${err.message}`);
    }
  }
}

module.exports = admin;
