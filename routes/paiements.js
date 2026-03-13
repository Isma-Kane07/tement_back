const express = require('express');
const router = express.Router();
const paiementController = require('../controllers/paiementController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post('/soumettre', 
  authMiddleware, 
  paiementController.soumettrePaiement
);

router.post('/valider', 
  authMiddleware, 
  roleMiddleware('admin'), 
  paiementController.validerPaiement
);

router.get('/en-attente', 
  authMiddleware, 
  roleMiddleware('admin'), 
  paiementController.listerPaiementsEnAttente
);

module.exports = router;