// services/firebase.js
const admin = require('firebase-admin');

// Initialiser Firebase Admin SDK
if (!admin.apps.length) {
  // Pour Railway : utiliser les variables d'environnement
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'app-tement',
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('✅ Firebase Admin SDK initialisé avec variables env (Railway)');
  } 
  // Pour le développement local avec fichier
  else {
    try {
      const serviceAccount = require('../service-account-key.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK initialisé avec fichier local');
    } catch (e) {
      console.log('⚠️ Firebase non configuré - les notifications ne fonctionneront pas');
      console.log('   Pour activer, ajoutez les variables FIREBASE_PRIVATE_KEY et FIREBASE_CLIENT_EMAIL');
    }
  }
}

const messaging = admin.apps.length ? admin.messaging() : null;

module.exports = { admin, messaging };