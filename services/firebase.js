// services/firebase.js
const admin = require('firebase-admin');
const path = require('path');

// Chemin vers le fichier de clé
const serviceAccount = require(path.join(__dirname, '../service-account-key.json'));

// Initialiser Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('✅ Firebase Admin SDK initialisé avec succès');
}

const messaging = admin.messaging();

module.exports = { admin, messaging };