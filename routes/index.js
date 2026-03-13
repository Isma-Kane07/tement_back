const express = require('express');
const router = express.Router();

console.log('🔄 Routes index chargé'); // Log

// Import des routes
const authRoutes = require('./auth');
const userRoutes = require('./users');
const logementRoutes = require('./logements');
const reservationRoutes = require('./reservations');
const paiementRoutes = require('./paiements');
const retraitRoutes = require('./retraits');
const walletRoutes = require('./wallet');
const transactionRoutes = require('./transactions');
const adminRoutes = require('./admin');
const uploadRoutes = require('./upload'); // ✅ IMPORTANT

console.log('✅ Routes upload chargée:', uploadRoutes ? 'Oui' : 'Non');

// Montage des routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/logements', logementRoutes);
router.use('/reservations', reservationRoutes);
router.use('/paiements', paiementRoutes);
router.use('/retraits', retraitRoutes);
router.use('/wallet', walletRoutes);
router.use('/transactions', transactionRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes); // ✅ IMPORTANT

console.log('📋 Routes montées: /upload');

module.exports = router;