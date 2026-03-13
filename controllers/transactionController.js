const { Transaction, Utilisateur } = require('../models');
const { Op } = require('sequelize');

exports.listerTransactions = async (req, res) => {
  try {
    const { user_id, type, statut, startDate, endDate } = req.query;
    
    let where = {};
    
    if (user_id) where.user_id = user_id;
    if (type) where.type = type;
    if (statut) where.statut = statut;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const transactions = await Transaction.findAll({
      where,
      include: [{
        model: Utilisateur,
        attributes: ['id', 'nom', 'telephone', 'role']
      }],
      order: [['createdAt', 'DESC']]
    });

    // Statistiques
    const stats = {
      total_montant: transactions.reduce((sum, t) => sum + t.montant, 0),
      par_type: {}
    };

    transactions.forEach(t => {
      if (!stats.par_type[t.type]) {
        stats.par_type[t.type] = {
          count: 0,
          montant: 0
        };
      }
      stats.par_type[t.type].count++;
      stats.par_type[t.type].montant += t.montant;
    });

    res.json({
      transactions,
      stats
    });

  } catch (err) {
    console.error("Erreur listerTransactions:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};