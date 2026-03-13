const { Logement, Utilisateur } = require('../models');
const { Op } = require('sequelize');

// Ajouter un logement (propriétaire)
exports.ajouterLogement = async (req, res) => {
  const { type, adresse, description, prix_nuit, photos } = req.body;
  const proprietaire_id = req.user.id;

  // Validation
  if (!type || !adresse || !prix_nuit) {
    return res.status(400).json({ message: "Type, adresse et prix/nuit sont requis" });
  }

  try {
    const logement = await Logement.create({
      proprietaire_id,
      type,
      adresse,
      description: description || '',
      prix_nuit: parseFloat(prix_nuit),
      photos: photos || [],
      disponible: true
    });

    res.status(201).json({ 
      message: "Logement ajouté avec succès", 
      logement 
    });

  } catch (err) {
    console.error("Erreur ajouterLogement:", err);
    
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: "Erreur de validation", 
        errors: err.errors.map(e => e.message) 
      });
    }
    
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ✅ MODIFIÉ : Lister logements avec recherche par lieu
exports.listerLogements = async (req, res) => {
  try {
    const { search, type, minPrix, maxPrix, proprietaire_id } = req.query;
    
    let where = {};
    
    // Par défaut, montrer seulement les logements disponibles pour les visiteurs
    if (!req.user || req.user.role !== 'proprietaire') {
      where.disponible = true;
    }
    
    // Si c'est un propriétaire qui demande SES logements
    if (proprietaire_id) {
      where.proprietaire_id = proprietaire_id;
      // Ne pas filtrer par disponibilité pour le propriétaire
      delete where.disponible;
    }
    
    // Recherche par lieu (adresse)
    if (search) {
      where.adresse = {
        [Op.iLike]: `%${search}%`  // Recherche insensible à la casse
      };
    }
    
    // Filtre par type
    if (type) {
      where.type = type;
    }
    
    // Filtre par prix
    if (minPrix || maxPrix) {
      where.prix_nuit = {};
      if (minPrix) where.prix_nuit[Op.gte] = parseFloat(minPrix);
      if (maxPrix) where.prix_nuit[Op.lte] = parseFloat(maxPrix);
    }

    const logements = await Logement.findAll({
      where,
      include: [{
        model: Utilisateur,
        as: 'Utilisateur',
        attributes: ['id', 'nom', 'photo_url']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(logements);

  } catch (err) {
    console.error("Erreur listerLogements:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// ✅ NOUVEAU : Désactiver/Activer un logement
exports.desactiverLogement = async (req, res) => {
  const { id } = req.params;
  const { disponible } = req.body;
  const proprietaire_id = req.user.id;

  try {
    const logement = await Logement.findByPk(id);

    if (!logement) {
      return res.status(404).json({ message: "Logement non trouvé" });
    }

    if (logement.proprietaire_id !== proprietaire_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Non autorisé" });
    }

    logement.disponible = disponible;
    await logement.save();

    res.json({ 
      message: disponible ? "Logement activé avec succès" : "Logement désactivé avec succès", 
      logement 
    });

  } catch (err) {
    console.error("Erreur desactiverLogement:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Obtenir logement par ID
exports.getLogement = async (req, res) => {
  const { id } = req.params;

  try {
    const logement = await Logement.findByPk(id, {
      include: [{
        model: Utilisateur,
        as: 'Utilisateur',
        attributes: ['id', 'nom', 'photo_url']
      }]
    });

    if (!logement) {
      return res.status(404).json({ message: "Logement non trouvé" });
    }

    res.json(logement);

  } catch (err) {
    console.error("Erreur getLogement:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Modifier logement
exports.modifierLogement = async (req, res) => {
  const { id } = req.params;
  const proprietaire_id = req.user.id;

  try {
    const logement = await Logement.findByPk(id);

    if (!logement) {
      return res.status(404).json({ message: "Logement non trouvé" });
    }

    if (logement.proprietaire_id !== proprietaire_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const { type, adresse, description, prix_nuit, photos } = req.body;

    if (type) logement.type = type;
    if (adresse) logement.adresse = adresse;
    if (description !== undefined) logement.description = description;
    if (prix_nuit) logement.prix_nuit = parseFloat(prix_nuit);
    if (photos !== undefined) logement.photos = photos;

    await logement.save();

    res.json({ 
      message: "Logement modifié avec succès", 
      logement 
    });

  } catch (err) {
    console.error("Erreur modifierLogement:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Supprimer logement
exports.supprimerLogement = async (req, res) => {
  const { id } = req.params;
  const proprietaire_id = req.user.id;

  try {
    const logement = await Logement.findByPk(id);

    if (!logement) {
      return res.status(404).json({ message: "Logement non trouvé" });
    }

    if (logement.proprietaire_id !== proprietaire_id && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Non autorisé" });
    }

    await logement.destroy();

    res.json({ message: "Logement supprimé avec succès" });

  } catch (err) {
    console.error("Erreur supprimerLogement:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};