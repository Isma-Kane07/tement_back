const express = require('express');
const router = express.Router();
const logementController = require('../controllers/logementController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Routes publiques (avec recherche)
router.get('/', logementController.listerLogements);
router.get('/:id', logementController.getLogement);

// Routes protégées (propriétaire)
router.post('/', 
  authMiddleware, 
  roleMiddleware('proprietaire'), 
  logementController.ajouterLogement
);

router.put('/:id', 
  authMiddleware, 
  roleMiddleware(['proprietaire', 'admin']), 
  logementController.modifierLogement
);

router.patch('/:id/desactiver', 
  authMiddleware, 
  roleMiddleware(['proprietaire', 'admin']), 
  logementController.desactiverLogement
);

router.delete('/:id', 
  authMiddleware, 
  roleMiddleware(['proprietaire', 'admin']), 
  logementController.supprimerLogement
);

module.exports = router;