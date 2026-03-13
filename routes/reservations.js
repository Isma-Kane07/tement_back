const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

router.post('/', 
  authMiddleware, 
  reservationController.creerReservation
);

router.get('/locataire', 
  authMiddleware, 
  reservationController.listerReservationsLocataire
);

router.get('/proprietaire',
  authMiddleware,
  roleMiddleware('proprietaire'),
  reservationController.listerReservationsProprietaire
);

router.put('/:id/confirmer',
  authMiddleware,
  roleMiddleware('proprietaire'),
  reservationController.confirmerReservation
);

router.put('/:id/annuler',
  authMiddleware,
  reservationController.annulerReservation
);

module.exports = router;