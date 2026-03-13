// controllers/paiementController.js
const { Paiement, Reservation, Logement, Utilisateur, Transaction } = require('../models');
const constants = require('../config/constants');

// 1️⃣ Le locataire soumet la preuve de paiement (il a payé sur votre compte)
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

    // Vérifier que le locataire connecté est bien celui de la réservation
    if (reservation.locataire_id !== req.user.id) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    if (reservation.statut !== constants.RESERVATION_STATUT.CONFIRME) {
      return res.status(400).json({ 
        message: "Réservation non confirmée par le propriétaire" 
      });
    }

    // Vérifier si un paiement existe déjà
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
    
    // Calcul des montants
    const debut = new Date(reservation.date_debut);
    const fin = new Date(reservation.date_fin);
    const nbNuits = Math.ceil((fin - debut) / (1000 * 60 * 60 * 24));
    const montant_total = nbNuits * logement.prix_nuit;

    const commission_tement = montant_total * constants.COMMISSION_RATE; // 15% pour vous
    const net_proprietaire = montant_total * (1 - constants.COMMISSION_RATE); // 85% pour le proprio

    const paiement = await Paiement.create({
      reservation_id,
      methode,
      montant_total,
      commission_tement,
      net_proprietaire,
      reference_transaction,
      statut: constants.PAIEMENT_STATUT.EN_ATTENTE // En attente de votre validation
    });

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

    // Marquer le paiement comme effectué
    paiement.statut = constants.PAIEMENT_STATUT.EFFECTUE;
    paiement.date_paiement = new Date();
    await paiement.save();

    const reservation = paiement.Reservation;
    const logement = reservation.Logement;

    // 👉 CRÉDITER LE PROPRIÉTAIRE (son wallet)
    const proprietaire = await Utilisateur.findByPk(logement.proprietaire_id);
    
    proprietaire.wallet_balance = (proprietaire.wallet_balance || 0) + paiement.net_proprietaire;
    await proprietaire.save();

    // ✅ METTRE À JOUR LE STATUT DE LA RÉSERVATION
    reservation.statut = constants.RESERVATION_STATUT.PAYE; // 'paye'
    await reservation.save();

    // 👉 ENREGISTRER LA TRANSACTION POUR LE PROPRIÉTAIRE
    await Transaction.create({
      user_id: proprietaire.id,
      type: constants.TRANSACTION_TYPES.REVENU_LOCATION,
      montant: paiement.net_proprietaire,
      description: `Revenu location - Réservation #${reservation.id} - Logement: ${logement.adresse}`,
      statut: 'valide'
    });

    // 👉 ENREGISTRER VOTRE COMMISSION (admin)
    await Transaction.create({
      user_id: req.user.id,
      admin_id: req.user.id,
      type: constants.TRANSACTION_TYPES.COMMISSION,
      montant: paiement.commission_tement,
      description: `Commission - Réservation #${reservation.id} - Propriétaire: ${proprietaire.nom}`,
      statut: 'valide'
    });

    // Optionnel: Marquer le logement comme indisponible pour ces dates
    logement.disponible = false;
    await logement.save();

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

// 3️⃣ VOIR TOUS LES PAIEMENTS EN ATTENTE (pour que vous puissiez valider)
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

    // Formatage pour l'affichage
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

    // Extraire les informations de la description
    const commissionsDetaillees = commissions.map(commission => {
      const commissionJSON = commission.toJSON();
      const description = commission.description || '';
      
      // Debug: Afficher la description pour voir le format
      console.log('Description:', description);
      
      // Extraire l'ID de réservation - Format: "Réservation #123"
      const reservationMatch = description.match(/Réservation #(\d+)/i);
      const reservationId = reservationMatch ? reservationMatch[1] : null;
      
      // Extraire l'adresse du logement - Format: "Logement: 123 Rue Example"
      // Capture tout après "Logement: " jusqu'au " - Propriétaire:"
      const logementMatch = description.match(/Logement:\s*([^-]+)/i);
      const logementAdresse = logementMatch ? logementMatch[1].trim() : null;
      
      // Extraire le nom du propriétaire - Format: "Propriétaire: Jean Dupont"
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