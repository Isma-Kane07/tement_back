const { Paiement, Utilisateur, Reservation, Logement, Transaction } = require('../models');
const { Op } = require('sequelize');
const constants = require('../config/constants');

// Dashboard existant
exports.dashboard = async (req, res) => {
  try {
    // Stats paiements
    const totalCommission = await Paiement.sum('commission_tement', {
      where: { statut: constants.PAIEMENT_STATUT.EFFECTUE }
    }) || 0;

    const totalRevenus = await Paiement.sum('montant_total', {
      where: { statut: constants.PAIEMENT_STATUT.EFFECTUE }
    }) || 0;

    const paiementsEnAttente = await Paiement.count({
      where: { statut: constants.PAIEMENT_STATUT.EN_ATTENTE }
    });

    // Stats utilisateurs
    const totalUtilisateurs = await Utilisateur.count();
    const totalProprietaires = await Utilisateur.count({
      where: { role: 'proprietaire' }
    });
    const totalLocataires = await Utilisateur.count({
      where: { role: 'locataire' }
    });

    // Stats logements
    const totalLogements = await Logement.count();
    const logementsDisponibles = await Logement.count({
      where: { disponible: true }
    });

    // Stats réservations
    const reservationsConfirmees = await Reservation.count({
      where: { statut: constants.RESERVATION_STATUT.CONFIRME }
    });
    
    const reservationsEnAttente = await Reservation.count({
      where: { statut: constants.RESERVATION_STATUT.EN_ATTENTE }
    });

    // Chiffre d'affaires mensuel
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);
    
    const caMensuel = await Paiement.sum('montant_total', {
      where: {
        statut: constants.PAIEMENT_STATUT.EFFECTUE,
        date_paiement: { [Op.gte]: debutMois }
      }
    }) || 0;

    // Retraits en attente
    const retraitsEnAttente = await Transaction.count({
      where: { 
        type: 'retrait',
        statut: 'en_attente'
      }
    });

    res.json({
      paiements: {
        totalCommission: Math.round(totalCommission * 100) / 100,
        totalRevenus: Math.round(totalRevenus * 100) / 100,
        paiementsEnAttente,
        caMensuel: Math.round(caMensuel * 100) / 100
      },
      utilisateurs: {
        total: totalUtilisateurs,
        proprietaires: totalProprietaires,
        locataires: totalLocataires
      },
      logements: {
        total: totalLogements,
        disponibles: logementsDisponibles
      },
      reservations: {
        confirmees: reservationsConfirmees,
        enAttente: reservationsEnAttente
      },
      retraits: {
        enAttente: retraitsEnAttente
      }
    });

  } catch (err) {
    console.error("Erreur dashboard:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// controllers/adminController.js - Modifier listerUtilisateurs

// ✅ CORRIGÉ: Lister tous les utilisateurs (sauf admins)
exports.listerUtilisateurs = async (req, res) => {
  try {
    const { role, search } = req.query;
    
    let where = {
      role: {
        [Op.ne]: 'admin' // Exclure les admins
      }
    };
    
    if (role && role !== 'all') {
      where.role = role;
    }
    
    if (search) {
      where[Op.or] = [
        { nom: { [Op.iLike]: `%${search}%` } },
        { telephone: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const utilisateurs = await Utilisateur.findAll({
      where,
      attributes: ['id', 'nom', 'telephone', 'role', 'photo_url', 'wallet_balance', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Statistiques (sans les admins)
    const totalLocataires = await Utilisateur.count({
      where: { role: 'locataire' }
    });
    
    const totalProprietaires = await Utilisateur.count({
      where: { role: 'proprietaire' }
    });

    res.json({
      total: utilisateurs.length,
      stats: {
        locataires: totalLocataires,
        proprietaires: totalProprietaires,
        total: totalLocataires + totalProprietaires
      },
      utilisateurs // ou "users" selon votre convention
    });

  } catch (err) {
    console.error("Erreur listerUtilisateurs:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ✅ NOUVEAU: Détails d'un utilisateur
exports.getUtilisateur = async (req, res) => {
  try {
    const { id } = req.params;

    const utilisateur = await Utilisateur.findByPk(id, {
      attributes: ['id', 'nom', 'telephone', 'role', 'photo_url', 'wallet_balance', 'createdAt'],
      include: [
        {
          model: Logement,
          as: 'Logements',
          limit: 5
        },
        {
          model: Reservation,
          as: 'Reservations',
          limit: 5
        }
      ]
    });

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Statistiques de l'utilisateur
    const stats = {};

    if (utilisateur.role === 'proprietaire') {
      stats.total_logements = await Logement.count({ where: { proprietaire_id: id } });
      stats.total_revenus = await Transaction.sum('montant', {
        where: { 
          user_id: id,
          type: 'revenu_location',
          statut: 'valide'
        }
      }) || 0;
    }

    if (utilisateur.role === 'locataire') {
      stats.total_reservations = await Reservation.count({ where: { locataire_id: id } });
      stats.total_depenses = await Paiement.sum('montant_total', {
        where: { 
          '$Reservation.locataire_id$': id,
          statut: 'effectue'
        },
        include: [{ model: Reservation }]
      }) || 0;
    }

    res.json({
      utilisateur,
      stats
    });

  } catch (err) {
    console.error("Erreur getUtilisateur:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ✅ NOUVEAU: Changer le rôle d'un utilisateur
exports.changerRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['locataire', 'proprietaire', 'admin'].includes(role)) {
      return res.status(400).json({ message: "Rôle invalide" });
    }

    const utilisateur = await Utilisateur.findByPk(id);

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Empêcher de modifier son propre rôle
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: "Vous ne pouvez pas modifier votre propre rôle" });
    }

    utilisateur.role = role;
    await utilisateur.save();

    res.json({
      message: "Rôle modifié avec succès",
      utilisateur: {
        id: utilisateur.id,
        nom: utilisateur.nom,
        role: utilisateur.role
      }
    });

  } catch (err) {
    console.error("Erreur changerRole:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.listerLogementsAdmin = async (req, res) => {
  try {
    const { disponible, proprietaire_id, search } = req.query;
    
    let where = {};
    
    if (disponible !== undefined) {
      where.disponible = disponible === 'true';
    }
    
    if (proprietaire_id) {
      where.proprietaire_id = proprietaire_id;
    }
    
    if (search) {
      where[Op.or] = [
        { adresse: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const logements = await Logement.findAll({
      where,
      include: [{
        model: Utilisateur,
        as: 'Utilisateur', // L'alias par défaut est 'Utilisateur'
        attributes: ['id', 'nom', 'telephone', 'photo_url']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Transformer les données pour que le frontend puisse utiliser 'proprietaire'
    const logementsTransformes = logements.map(logement => {
      const logementJSON = logement.toJSON();
      return {
        ...logementJSON,
        proprietaire: logementJSON.Utilisateur // Créer un alias 'proprietaire'
      };
    });

    // Statistiques
    const stats = {
      total: logements.length,
      disponibles: logements.filter(l => l.disponible).length,
      indisponibles: logements.filter(l => !l.disponible).length,
      prix_moyen: logements.reduce((sum, l) => sum + l.prix_nuit, 0) / logements.length || 0
    };

    res.json({
      stats,
      logements: logementsTransformes
    });

  } catch (err) {
    console.error("Erreur listerLogementsAdmin:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ✅ NOUVEAU: Changer le statut d'un logement (admin)
exports.changerStatutLogement = async (req, res) => {
  try {
    const { id } = req.params;
    const { disponible } = req.body;

    const logement = await Logement.findByPk(id);

    if (!logement) {
      return res.status(404).json({ message: "Logement non trouvé" });
    }

    logement.disponible = disponible;
    await logement.save();

    res.json({
      message: `Logement ${disponible ? 'activé' : 'désactivé'} avec succès`,
      logement
    });

  } catch (err) {
    console.error("Erreur changerStatutLogement:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ✅ NOUVEAU: Statistiques avancées
exports.statsAvancees = async (req, res) => {
  try {
    const { periode } = req.query; // 'jour', 'semaine', 'mois', 'an'
    
    let dateDebut = new Date();
    
    switch(periode) {
      case 'jour':
        dateDebut.setHours(0, 0, 0, 0);
        break;
      case 'semaine':
        dateDebut.setDate(dateDebut.getDate() - 7);
        break;
      case 'mois':
        dateDebut.setMonth(dateDebut.getMonth() - 1);
        break;
      case 'an':
        dateDebut.setFullYear(dateDebut.getFullYear() - 1);
        break;
      default:
        dateDebut.setMonth(dateDebut.getMonth() - 1); // 1 mois par défaut
    }

    // Top propriétaires
    const topProprietaires = await Transaction.findAll({
      where: {
        type: 'revenu_location',
        statut: 'valide',
        createdAt: { [Op.gte]: dateDebut }
      },
      include: [{
        model: Utilisateur,
        attributes: ['id', 'nom', 'telephone']
      }],
      attributes: [
        'user_id',
        [sequelize.fn('SUM', sequelize.col('montant')), 'total_revenus']
      ],
      group: ['user_id', 'Utilisateur.id'],
      order: [[sequelize.literal('total_revenus'), 'DESC']],
      limit: 5
    });

    // Top logements
    const topLogements = await Reservation.findAll({
      where: {
        statut: constants.RESERVATION_STATUT.CONFIRME,
        createdAt: { [Op.gte]: dateDebut }
      },
      include: [{
        model: Logement,
        attributes: ['id', 'adresse', 'prix_nuit']
      }],
      attributes: [
        'logement_id',
        [sequelize.fn('COUNT', sequelize.col('Reservation.id')), 'nb_reservations']
      ],
      group: ['logement_id', 'Logement.id'],
      order: [[sequelize.literal('nb_reservations'), 'DESC']],
      limit: 5
    });

    // Évolution des revenus
    const evolution = await Paiement.findAll({
      where: {
        statut: constants.PAIEMENT_STATUT.EFFECTUE,
        date_paiement: { [Op.gte]: dateDebut }
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'day', sequelize.col('date_paiement')), 'jour'],
        [sequelize.fn('SUM', sequelize.col('montant_total')), 'total'],
        [sequelize.fn('SUM', sequelize.col('commission_tement')), 'commissions']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'day', sequelize.col('date_paiement'))],
      order: [[sequelize.fn('DATE_TRUNC', 'day', sequelize.col('date_paiement')), 'ASC']]
    });

    res.json({
      periode,
      topProprietaires,
      topLogements,
      evolution
    });

  } catch (err) {
    console.error("Erreur statsAvancees:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};