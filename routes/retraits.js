const express = require('express');
const router = express.Router();
const retraitController = require('../controllers/retraitController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Routes pour les propriétaires
router.post('/demander', 
  authMiddleware, 
  retraitController.demanderRetrait
);

router.get('/historique', 
  authMiddleware, 
  retraitController.historiqueRetraits
);

// ✅ AJOUTER: Routes pour admin
router.get('/en-attente', 
  authMiddleware, 
  roleMiddleware('admin'), 
  retraitController.listerRetraitsEnAttente
);

router.post('/valider', 
  authMiddleware, 
  roleMiddleware('admin'), 
  retraitController.validerRetrait
);

router.post('/refuser', 
  authMiddleware, 
  roleMiddleware('admin'), 
  retraitController.refuserRetrait
);

module.exports = router;