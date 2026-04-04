// controllers/retraitController.js
const { Utilisateur, Transaction } = require('../models');
const notificationService = require('../services/notificationService');

// 1️⃣ PROPRIÉTAIRE demande un retrait
exports.demanderRetrait = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { montant, methode_retrait } = req.body;

    if (!montant || montant <= 0) {
      return res.status(400).json({ message: "Montant invalide" });
    }

    if (req.user.role !== 'proprietaire') {
      return res.status(403).json({ message: "Seuls les propriétaires peuvent demander un retrait" });
    }

    const user = await Utilisateur.findByPk(user_id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (user.wallet_balance < montant) {
      return res.status(400).json({ 
        message: "Solde insuffisant",
        solde_actuel: user.wallet_balance,
        montant_demande: montant
      });
    }

    const MONTANT_MINIMUM = 5000;
    if (montant < MONTANT_MINIMUM) {
      return res.status(400).json({ 
        message: `Le montant minimum de retrait est de ${MONTANT_MINIMUM} FCFA` 
      });
    }

    const transaction = await Transaction.create({
      user_id,
      type: 'retrait',
      montant,
      statut: 'en_attente',
      description: `Demande de retrait de ${montant} FCFA via ${methode_retrait || 'Mobile Money'}`
    });

    // 🔔 NOTIFICATION: Demande de retrait à l'admin
    await notificationService.sendToUser(
      1, // ID de l'admin
      {
        title: '💸 Demande de retrait',
        body: `${user.nom} demande un retrait de ${montant} FCFA`,
      },
      {
        type: 'retrait_demande',
        transactionId: transaction.id.toString(),
        montant: montant.toString(),
        proprietaire: user.nom,
      }
    );

    res.status(201).json({ 
      message: "✅ Demande de retrait envoyée, en attente de validation admin",
      demande: {
        id: transaction.id,
        montant,
        date_demande: transaction.createdAt,
        statut: transaction.statut
      },
      solde_actuel: user.wallet_balance
    });

  } catch (err) {
    console.error("Erreur demanderRetrait:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 2️⃣ ADMIN valide le retrait
exports.validerRetrait = async (req, res) => {
  try {
    const { transaction_id, reference_virement } = req.body;

    const transaction = await Transaction.findByPk(transaction_id, {
      include: [{ model: Utilisateur }]
    });
    
    if (!transaction || transaction.type !== 'retrait') {
      return res.status(404).json({ message: "Demande de retrait invalide" });
    }

    if (transaction.statut !== 'en_attente') {
      return res.status(400).json({ message: "Cette demande a déjà été traitée" });
    }

    const proprietaire = transaction.Utilisateur;

    if (proprietaire.wallet_balance < transaction.montant) {
      transaction.statut = 'refuse';
      await transaction.save();
      
      return res.status(400).json({ 
        message: "❌ Solde insuffisant pour ce retrait",
        solde_actuel: proprietaire.wallet_balance
      });
    }

    proprietaire.wallet_balance -= transaction.montant;
    await proprietaire.save();

    transaction.statut = 'valide';
    transaction.description += ` | Validé le ${new Date().toLocaleDateString()} | Ref: ${reference_virement || 'N/A'}`;
    await transaction.save();

    // 🔔 NOTIFICATION: Retrait validé au propriétaire
    await notificationService.sendToUser(
      proprietaire.id,
      {
        title: '✅ Retrait validé',
        body: `Votre retrait de ${transaction.montant} FCFA a été traité avec succès`,
      },
      {
        type: 'retrait_valide',
        transactionId: transaction.id.toString(),
        montant: transaction.montant.toString(),
        reference: reference_virement || 'N/A',
      }
    );

    res.json({ 
      message: "✅ Retrait validé avec succès",
      details: {
        proprietaire: proprietaire.nom,
        montant_verse: transaction.montant,
        reference: reference_virement || 'Non spécifiée',
        nouveau_solde: proprietaire.wallet_balance
      }
    });

  } catch (err) {
    console.error("Erreur validerRetrait:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 3️⃣ ADMIN refuse le retrait
exports.refuserRetrait = async (req, res) => {
  try {
    const { transaction_id, raison } = req.body;

    const transaction = await Transaction.findByPk(transaction_id);
    
    if (!transaction || transaction.type !== 'retrait') {
      return res.status(404).json({ message: "Demande de retrait invalide" });
    }

    if (transaction.statut !== 'en_attente') {
      return res.status(400).json({ message: "Cette demande a déjà été traitée" });
    }

    transaction.statut = 'refuse';
    transaction.description = raison 
      ? `Refusé: ${raison}` 
      : `Demande de retrait refusée`;
    await transaction.save();

    const proprietaire = await Utilisateur.findByPk(transaction.user_id);

    // 🔔 NOTIFICATION: Retrait refusé au propriétaire
    if (proprietaire) {
      await notificationService.sendToUser(
        proprietaire.id,
        {
          title: '❌ Retrait refusé',
          body: raison 
            ? `Votre demande de retrait a été refusée: ${raison}`
            : 'Votre demande de retrait a été refusée',
        },
        {
          type: 'retrait_refuse',
          transactionId: transaction.id.toString(),
          raison: raison || 'Non spécifiée',
        }
      );
    }

    res.json({ 
      message: "Demande de retrait refusée",
      transaction 
    });

  } catch (err) {
    console.error("Erreur refuserRetrait:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// 4️⃣ PROPRIÉTAIRE consulte l'historique
exports.historiqueRetraits = async (req, res) => {
  try {
    const retraits = await Transaction.findAll({
      where: { 
        user_id: req.user.id,
        type: 'retrait'
      },
      order: [['createdAt', 'DESC']]
    });

    const stats = {
      total_retraits_valides: retraits
        .filter(r => r.statut === 'valide')
        .reduce((sum, r) => sum + r.montant, 0),
      en_attente: retraits
        .filter(r => r.statut === 'en_attente')
        .reduce((sum, r) => sum + r.montant, 0),
      refuse: retraits
        .filter(r => r.statut === 'refuse')
        .reduce((sum, r) => sum + r.montant, 0)
    };

    res.json({
      stats,
      retraits
    });

  } catch (err) {
    console.error("Erreur historiqueRetraits:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Lister les retraits en attente (admin)
exports.listerRetraitsEnAttente = async (req, res) => {
  try {
    const retraits = await Transaction.findAll({
      where: { 
        type: 'retrait',
        statut: 'en_attente'
      },
      include: [{
        model: Utilisateur,
        attributes: ['id', 'nom', 'telephone', 'wallet_balance']
      }],
      order: [['createdAt', 'ASC']]
    });

    const result = retraits.map(r => ({
      id: r.id,
      montant: r.montant,
      date_demande: r.createdAt,
      description: r.description,
      proprietaire: {
        id: r.Utilisateur.id,
        nom: r.Utilisateur.nom,
        telephone: r.Utilisateur.telephone
      },
      solde_avant: r.Utilisateur.wallet_balance
    }));

    res.json({
      total: result.length,
      retraits: result
    });

  } catch (err) {
    console.error("Erreur listerRetraitsEnAttente:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};