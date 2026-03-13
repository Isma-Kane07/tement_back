const { Utilisateur } = require('../models');
const bcrypt = require('bcrypt');

// Obtenir le profil connecté
exports.getProfil = async (req, res) => {
  try {
    const user = await Utilisateur.findByPk(req.user.id, {
      attributes: ['id', 'nom', 'telephone', 'role', 'photo_url', 'wallet_balance', 'createdAt']
    });
    
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }
    
    res.json(user);
  } catch (err) {
    console.error("Erreur getProfil:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Mettre à jour profil
exports.updateProfil = async (req, res) => {
  const { nom, mot_de_passe, photo_url } = req.body;
  
  try {
    const user = await Utilisateur.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    if (nom) user.nom = nom;
    if (photo_url !== undefined) user.photo_url = photo_url;
    
    if (mot_de_passe) {
      if (mot_de_passe.length < 6) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
      }
      const hashedPassword = await bcrypt.hash(mot_de_passe, 10);
      user.mot_de_passe = hashedPassword;
    }

    await user.save();

    res.json({
      message: "Profil mis à jour avec succès",
      user: {
        id: user.id,
        nom: user.nom,
        telephone: user.telephone,
        role: user.role,
        photo_url: user.photo_url,
        wallet_balance: user.wallet_balance
      }
    });
  } catch (err) {
    console.error("Erreur updateProfil:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};