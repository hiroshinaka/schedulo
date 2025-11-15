// backend/firebaseAdmin.js
const admin = require('firebase-admin');
const fs = require('fs');

function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length) return admin;

  const envB64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;

  if (envB64) {
    try {
      const decoded = Buffer.from(envB64, 'base64').toString('utf8');
      const svc = JSON.parse(decoded);
      admin.initializeApp({ credential: admin.credential.cert(svc) });
      return admin;
    } catch (err) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON_B64', err);
      throw err;
    }
  }

  // fallback to default application credentials (GCP)
  admin.initializeApp();
  return admin;
}

module.exports = initFirebaseAdmin;