const { Utilisateur } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const constants = require('../config/constants');
require('dotenv').config();

exports.signup = async (req, res) => {
  const { nom, telephone, mot_de_passe, role, photo_url } = req.body;

  // Validation rapide
  if (!nom || !telephone || !mot_de_passe || !role) {
    return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis" });
  }

  try {
    const existingUser = await Utilisateur.findOne({ where: { telephone } });
    if (existingUser) {
      return res.status(400).json({ message: "Téléphone déjà utilisé" });
    }

    const hashedPassword = await bcrypt.hash(mot_de_passe, 10);

    const user = await Utilisateur.create({
      nom,
      telephone,
      mot_de_passe: hashedPassword,
      role,
      photo_url: photo_url || null,
      wallet_balance: 0
    });

    // 🔴 AJOUTER LA GÉNÉRATION DU TOKEN
    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: constants.JWT_EXPIRES_IN }
    );

    return res.status(201).json({ 
      message: "Utilisateur créé avec succès", 
      token, // ✅ Maintenant le token est renvoyé
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
    console.error("Erreur signup:", err);
    
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: "Erreur de validation", 
        errors: err.errors.map(e => e.message) 
      });
    }
    
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// CONNEXION
exports.login = async (req, res) => {
  const { telephone, mot_de_passe } = req.body;

  if (!telephone || !mot_de_passe) {
    return res.status(400).json({ message: "Téléphone et mot de passe requis" });
  }

  try {
    const user = await Utilisateur.findOne({ where: { telephone } });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const match = await bcrypt.compare(mot_de_passe, user.mot_de_passe);
    if (!match) {
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: constants.JWT_EXPIRES_IN }
    );

    res.json({
      message: "Connexion réussie",
      token,
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
    console.error("Erreur login:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};