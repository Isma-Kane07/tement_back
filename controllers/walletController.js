const { Transaction, Utilisateur } = require('../models');

exports.historiqueWallet = async (req, res) => {
  try {
    const user_id = req.user.id;

    // Vérifier que l'utilisateur est propriétaire
    if (req.user.role !== 'proprietaire' && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: "Accès refusé. Seuls les propriétaires peuvent consulter leur wallet." 
      });
    }

    const transactions = await Transaction.findAll({
      where: { 
        user_id,
        type: ['revenu_location', 'retrait'] // Seules les transactions financières
      },
      order: [['createdAt', 'DESC']]
    });

    const user = await Utilisateur.findByPk(user_id, {
      attributes: ['id', 'nom', 'wallet_balance']
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Calcul des statistiques
    const stats = {
      total_revenus: 0,
      total_retraits: 0,
      en_attente: 0
    };

    transactions.forEach(t => {
      if (t.type === 'revenu_location' && t.statut === 'valide') {
        stats.total_revenus += t.montant;
      } else if (t.type === 'retrait') {
        if (t.statut === 'valide') {
          stats.total_retraits += t.montant;
        } else if (t.statut === 'en_attente') {
          stats.en_attente += t.montant;
        }
      }
    });

    res.json({
      solde_actuel: user.wallet_balance,
      stats,
      transactions
    });

  } catch (err) {
    console.error("Erreur historiqueWallet:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};