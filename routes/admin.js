const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const paiementController = require('../controllers/paiementController');
const utilisateurController = require('../controllers/userController'); // À créer
const logementController = require('../controllers/logementController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

// Dashboard
router.get('/dashboard', 
  authMiddleware, 
  roleMiddleware('admin'), 
  adminController.dashboard
);

// Commissions
router.get('/commissions', 
  authMiddleware, 
  roleMiddleware('admin'), 
  paiementController.historiqueCommissions 
);

router.get('/utilisateurs', 
  authMiddleware, 
  roleMiddleware('admin'), 
  adminController.listerUtilisateurs
);

router.get('/utilisateurs/:id', 
  authMiddleware, 
  roleMiddleware('admin'), 
  adminController.getUtilisateur
);

router.put('/utilisateurs/:id/role', 
  authMiddleware, 
  roleMiddleware('admin'), 
  adminController.changerRole
);

// ✅ AJOUTER: Gestion des logements (admin)
router.get('/logements', 
  authMiddleware, 
  roleMiddleware('admin'), 
  adminController.listerLogementsAdmin
);

router.put('/logements/:id/status', 
  authMiddleware, 
  roleMiddleware('admin'), 
  adminController.changerStatutLogement
);

// ✅ AJOUTER: Stats avancées
router.get('/stats', 
  authMiddleware, 
  roleMiddleware('admin'), 
  adminController.statsAvancees
);

module.exports = router;