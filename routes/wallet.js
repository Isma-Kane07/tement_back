const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/historique', 
  authMiddleware, 
  walletController.historiqueWallet
);

module.exports = router;