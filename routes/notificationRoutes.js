// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/save-token', authMiddleware, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;

    if (!fcmToken) {
      return res.status(400).json({ success: false, message: 'Token manquant' });
    }

    await notificationService.saveFcmToken(userId, fcmToken);
    res.json({ success: true, message: 'Token sauvegardé' });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;