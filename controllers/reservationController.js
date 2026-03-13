const { Reservation, Logement, Utilisateur, Paiement } = require('../models');
const { Op } = require('sequelize');
const constants = require('../config/constants');

// ========================
// CREER RESERVATION
// ========================
exports.creerReservation = async (req, res) => {
  const locataire_id = req.user.id;
  const { logement_id, date_debut, date_fin } = req.body;

  // Validation
  if (!logement_id || !date_debut || !date_fin) {
    return res.status(400).json({ message: "Tous les champs sont requis" });
  }

  try {
    const logement = await Logement.findByPk(logement_id);

    if (!logement) {
      return res.status(404).json({ message: "Logement non trouvé" });
    }

    if (!logement.disponible) {
      return res.status(400).json({ message: "Logement indisponible" });
    }

    if (logement.proprietaire_id === locataire_id) {
      return res.status(400).json({ message: "Impossible de réserver son propre logement" });
    }

    const debut = new Date(date_debut);
    const fin = new Date(date_fin);
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);

    if (debut < aujourdHui) {
      return res.status(400).json({ message: "La date de début ne peut pas être dans le passé" });
    }

    if (fin <= debut) {
      return res.status(400).json({ message: "La date de fin doit être après la date de début" });
    }

    // Vérifier chevauchement avec réservations confirmées
    const conflit = await Reservation.findOne({
      where: {
        logement_id,
        statut: constants.RESERVATION_STATUT.CONFIRME,
        [Op.or]: [
          {
            date_debut: { [Op.between]: [date_debut, date_fin] }
          },
          {
            date_fin: { [Op.between]: [date_debut, date_fin] }
          },
          {
            [Op.and]: [
              { date_debut: { [Op.lte]: date_debut } },
              { date_fin: { [Op.gte]: date_fin } }
            ]
          }
        ]
      }
    });

    if (conflit) {
      return res.status(400).json({ message: "Logement déjà réservé à ces dates" });
    }

    const diffTime = Math.abs(fin - debut);
    const diffNuits = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const montant_total = logement.prix_nuit * diffNuits;

    const reservation = await Reservation.create({
      logement_id,
      locataire_id,
      date_debut,
      date_fin,
      montant_total,
      statut: constants.RESERVATION_STATUT.EN_ATTENTE
    });

    res.status(201).json({
      message: "Réservation créée, en attente de confirmation",
      reservation
    });

  } catch (err) {
    console.error("Erreur creerReservation:", err);
    
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: "Erreur de validation", 
        errors: err.errors.map(e => e.message) 
      });
    }
    
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ========================
// LISTER LOCATAIRE
// ========================
exports.listerReservationsLocataire = async (req, res) => {
  try {
    const reservations = await Reservation.findAll({
      where: { locataire_id: req.user.id },
      include: [
        { 
          model: Logement,
          include: [{
            model: Utilisateur,
            as: 'Utilisateur',
            attributes: ['id', 'nom', 'photo_url']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(reservations);

  } catch (err) {
    console.error("Erreur listerReservationsLocataire:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ========================
// LISTER PROPRIETAIRE
// ========================
exports.listerReservationsProprietaire = async (req, res) => {
  try {
    const reservations = await Reservation.findAll({
      include: [
        {
          model: Logement,
          where: { proprietaire_id: req.user.id },
          include: [{
            model: Utilisateur,
            as: 'Utilisateur',
            attributes: ['id', 'nom', 'photo_url']
          }]
        },
        {
          model: Utilisateur,
          as: 'Utilisateur',
          attributes: ['id', 'nom', 'photo_url']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json(reservations);

  } catch (err) {
    console.error("Erreur listerReservationsProprietaire:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ========================
// CONFIRMER RESERVATION
// ========================
exports.confirmerReservation = async (req, res) => {
  const { id } = req.params;

  try {
    const reservation = await Reservation.findByPk(id, { 
      include: [{ model: Logement }] 
    });

    if (!reservation) {
      return res.status(404).json({ message: "Réservation non trouvée" });
    }

    if (reservation.Logement.proprietaire_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Non autorisé" });
    }

    if (reservation.statut !== constants.RESERVATION_STATUT.EN_ATTENTE) {
      return res.status(400).json({ 
        message: `Réservation déjà ${reservation.statut}` 
      });
    }

    // Double vérification conflit
    const conflit = await Reservation.findOne({
      where: {
        logement_id: reservation.logement_id,
        statut: constants.RESERVATION_STATUT.CONFIRME,
        id: { [Op.ne]: id }, // Exclure la réservation actuelle
        [Op.or]: [
          {
            date_debut: { [Op.between]: [reservation.date_debut, reservation.date_fin] }
          },
          {
            date_fin: { [Op.between]: [reservation.date_debut, reservation.date_fin] }
          },
          {
            [Op.and]: [
              { date_debut: { [Op.lte]: reservation.date_debut } },
              { date_fin: { [Op.gte]: reservation.date_fin } }
            ]
          }
        ]
      }
    });

    if (conflit) {
      return res.status(400).json({ message: "Conflit détecté avec une autre réservation confirmée" });
    }

    reservation.statut = constants.RESERVATION_STATUT.CONFIRME;
    await reservation.save();

    res.json({
      message: "Réservation confirmée avec succès",
      reservation,
      montant_a_payer: reservation.montant_total
    });

  } catch (err) {
    console.error("Erreur confirmerReservation:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ========================
// ANNULER RESERVATION
// ========================
exports.annulerReservation = async (req, res) => {
  const { id } = req.params;

  try {
    const reservation = await Reservation.findByPk(id, { 
      include: [{ model: Logement }] 
    });

    if (!reservation) {
      return res.status(404).json({ message: "Réservation non trouvée" });
    }

    if (
      reservation.locataire_id !== req.user.id &&
      reservation.Logement.proprietaire_id !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    if (reservation.statut === constants.RESERVATION_STATUT.ANNULE) {
      return res.status(400).json({ message: "Réservation déjà annulée" });
    }

    // Vérifier si un paiement a déjà été effectué
    const paiement = await Paiement.findOne({
      where: { 
        reservation_id: id,
        statut: constants.PAIEMENT_STATUT.EFFECTUE
      }
    });

    if (paiement) {
      return res.status(400).json({ 
        message: "Impossible d'annuler : un paiement a déjà été effectué pour cette réservation" 
      });
    }

    reservation.statut = constants.RESERVATION_STATUT.ANNULE;
    await reservation.save();

    res.json({ 
      message: "Réservation annulée avec succès", 
      reservation 
    });

  } catch (err) {
    console.error("Erreur annulerReservation:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};