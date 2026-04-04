// controllers/paiementController.js
const { Paiement, Reservation, Logement, Utilisateur, Transaction } = require('../models');
const constants = require('../config/constants');
const notificationService = require('../services/notificationService');

// 1️⃣ Le locataire soumet la preuve de paiement
exports.soumettrePaiement = async (req, res) => {
  const { reservation_id, methode, reference_transaction } = req.body;

  if (!reservation_id || !methode || !reference_transaction) {
    return res.status(400).json({ message: "Tous les champs sont requis" });
  }

  try {
    const reservation = await Reservation.findByPk(reservation_id, {
      include: [{ model: Logement }]
    });

    if (!reservation) {
      return res.status(404).json({ message: "Réservation non trouvée" });
    }

    if (reservation.locataire_id !== req.user.id) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    if (reservation.statut !== constants.RESERVATION_STATUT.CONFIRME) {
      return res.status(400).json({ 
        message: "Réservation non confirmée par le propriétaire" 
      });
    }

    const paiementExistant = await Paiement.findOne({
      where: { reservation_id }
    });

    if (paiementExistant) {
      return res.status(400).json({ 
        message: "Un paiement a déjà été soumis",
        statut: paiementExistant.statut
      });
    }

    const logement = reservation.Logement;
    
    const debut = new Date(reservation.date_debut);
    const fin = new Date(reservation.date_fin);
    const nbNuits = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));
    const montant_total = nbNuits * logement.prix_nuit;

    const commission_tement = montant_total * constants.COMMISSION_RATE;
    const net_proprietaire = montant_total * (1 - constants.COMMISSION_RATE);

    const paiement = await Paiement.create({
      reservation_id,
      methode,
      montant_total,
      commission_tement,
      net_proprietaire,
      reference_transaction,
      statut: constants.PAIEMENT_STATUT.EN_ATTENTE
    });

    // 🔔 NOTIFICATION: Paiement soumis à l'admin
    const locataire = await Utilisateur.findByPk(req.user.id);
    
    await notificationService.sendToUser(
      1, // ID de l'admin (à ajuster selon ton admin)
      {
        title: '💰 Nouveau paiement en attente',
        body: `${locataire.nom} a soumis un paiement de ${montant_total} FCFA`,
      },
      {
        type: 'paiement_soumis',
        paiementId: paiement.id.toString(),
        reservationId: reservation.id.toString(),
        montant: montant_total.toString(),
        locataire: locataire.nom,
      }
    );

    res.status(201).json({ 
      message: "Preuve de paiement soumise, en attente de validation admin", 
      paiement: {
        id: paiement.id,
        montant_total,
        commission: commission_tement,
        net_proprietaire,
        statut: paiement.statut
      }
    });

  } catch (err) {
    console.error("Erreur soumettrePaiement:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 2️⃣ ADMIN valide le paiement
exports.validerPaiement = async (req, res) => {
  const { paiement_id } = req.body;

  try {
    const paiement = await Paiement.findByPk(paiement_id, {
      include: {
        model: Reservation,
        include: [{ model: Logement }]
      }
    });

    if (!paiement) {
      return res.status(404).json({ message: "Paiement non trouvé" });
    }

    if (paiement.statut !== constants.PAIEMENT_STATUT.EN_ATTENTE) {
      return res.status(400).json({ message: "Paiement déjà traité" });
    }

    paiement.statut = constants.PAIEMENT_STATUT.EFFECTUE;
    paiement.date_paiement = new Date();
    await paiement.save();

    const reservation = paiement.Reservation;
    const logement = reservation.Logement;
    const proprietaire = await Utilisateur.findByPk(logement.proprietaire_id);
    
    proprietaire.wallet_balance = (proprietaire.wallet_balance || 0) + paiement.net_proprietaire;
    await proprietaire.save();

    reservation.statut = constants.RESERVATION_STATUT.PAYE;
    await reservation.save();

    await Transaction.create({
      user_id: proprietaire.id,
      type: constants.TRANSACTION_TYPES.REVENU_LOCATION,
      montant: paiement.net_proprietaire,
      description: `Revenu location - Réservation #${reservation.id} - Logement: ${logement.adresse}`,
      statut: 'valide'
    });

    await Transaction.create({
      user_id: req.user.id,
      admin_id: req.user.id,
      type: constants.TRANSACTION_TYPES.COMMISSION,
      montant: paiement.commission_tement,
      description: `Commission - Réservation #${reservation.id} - Propriétaire: ${proprietaire.nom}`,
      statut: 'valide'
    });

    logement.disponible = false;
    await logement.save();

    const locataire = await Utilisateur.findByPk(reservation.locataire_id);

    // 🔔 NOTIFICATION 1: Au propriétaire (argent crédité)
    await notificationService.sendToUser(
      proprietaire.id,
      {
        title: '💰 Paiement reçu',
        body: `${paiement.net_proprietaire} FCFA a été crédité sur votre wallet pour la réservation #${reservation.id}`,
      },
      {
        type: 'paiement_recu',
        reservationId: reservation.id.toString(),
        montant: paiement.net_proprietaire.toString(),
      }
    );

    // 🔔 NOTIFICATION 2: Au locataire (paiement validé)
    await notificationService.sendToUser(
      reservation.locataire_id,
      {
        title: '✓ Paiement validé',
        body: `Votre paiement de ${paiement.montant_total} FCFA a été validé. Bon séjour chez ${logement.adresse} !`,
      },
      {
        type: 'paiement_valide',
        reservationId: reservation.id.toString(),
      }
    );

    res.json({ 
      message: "✅ Paiement validé avec succès",
      details: {
        montant_total: paiement.montant_total,
        votre_commission: paiement.commission_tement,
        verse_au_proprietaire: paiement.net_proprietaire,
        proprietaire: {
          nom: proprietaire.nom,
          nouveau_solde: proprietaire.wallet_balance
        }
      }
    });

  } catch (err) {
    console.error("Erreur validerPaiement:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 3️⃣ VOIR TOUS LES PAIEMENTS EN ATTENTE
exports.listerPaiementsEnAttente = async (req, res) => {
  try {
    const paiements = await Paiement.findAll({
      where: { statut: constants.PAIEMENT_STATUT.EN_ATTENTE },
      include: {
        model: Reservation,
        include: [
          { 
            model: Logement,
            include: [{
              model: Utilisateur,
              as: 'Utilisateur',
              attributes: ['id', 'nom', 'telephone']
            }]
          },
          {
            model: Utilisateur,
            as: 'Utilisateur',
            attributes: ['id', 'nom', 'telephone']
          }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    const result = paiements.map(p => ({
      id: p.id,
      reference: p.reference_transaction,
      methode: p.methode,
      montant_total: p.montant_total,
      commission: p.commission_tement,
      net_proprietaire: p.net_proprietaire,
      date_soumission: p.createdAt,
      reservation: {
        id: p.Reservation.id,
        dates: {
          debut: p.Reservation.date_debut,
          fin: p.Reservation.date_fin
        }
      },
      locataire: p.Reservation.Utilisateur,
      logement: {
        adresse: p.Reservation.Logement.adresse,
        proprietaire: p.Reservation.Logement.Utilisateur
      }
    }));

    res.json({
      total: result.length,
      paiements: result
    });

  } catch (err) {
    console.error("Erreur listerPaiementsEnAttente:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.historiqueCommissions = async (req, res) => {
  try {
    const commissions = await Transaction.findAll({
      where: { 
        type: constants.TRANSACTION_TYPES.COMMISSION,
        admin_id: req.user.id
      },
      include: [{
        model: Utilisateur,
        as: 'Utilisateur',
        attributes: ['id', 'nom', 'telephone']
      }],
      order: [['createdAt', 'DESC']]
    });

    const commissionsDetaillees = commissions.map(commission => {
      const commissionJSON = commission.toJSON();
      const description = commission.description || '';
      
      const reservationMatch = description.match(/Réservation #(\d+)/i);
      const reservationId = reservationMatch ? reservationMatch[1] : null;
      
      const logementMatch = description.match(/Logement:\s*([^-]+)/i);
      const logementAdresse = logementMatch ? logementMatch[1].trim() : null;
      
      const proprioMatch = description.match(/Propriétaire:\s*([^.]+)/i);
      const proprietaireNom = proprioMatch ? proprioMatch[1].trim() : null;
      
      return {
        ...commissionJSON,
        reservation_id: reservationId,
        logement: logementAdresse ? { adresse: logementAdresse } : null,
        proprietaire: proprietaireNom ? { nom: proprietaireNom } : null
      };
    });

    const total = commissionsDetaillees.reduce((sum, c) => sum + c.montant, 0);

    res.json({
      total_commissions: total,
      nombre_transactions: commissionsDetaillees.length,
      commissions: commissionsDetaillees
    });

  } catch (err) {
    console.error("Erreur historiqueCommissions:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};