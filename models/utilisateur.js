const constants = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const Utilisateur = sequelize.define("Utilisateur", {
    nom: { 
      type: DataTypes.STRING, 
      allowNull: false,
      validate: { notEmpty: true }
    },
    telephone: { 
      type: DataTypes.STRING, 
      unique: true, 
      allowNull: false,
      validate: { 
        notEmpty: true,
        is: /^[0-9]{8,15}$/ // Validation simple pour téléphone
      }
    },
    mot_de_passe: { 
      type: DataTypes.STRING, 
      allowNull: false,
      validate: { notEmpty: true }
    },
    role: { 
      type: DataTypes.ENUM('locataire', 'proprietaire', 'admin'), 
      allowNull: false,
      validate: {
        isIn: [['locataire', 'proprietaire', 'admin']]
      }
    },
    photo_url: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    wallet_balance: { 
      type: DataTypes.FLOAT, 
      defaultValue: 0,
      validate: { min: 0 }
    },
    fcmToken: { 
  type: DataTypes.STRING, 
  allowNull: true 
}
  });

  Utilisateur.associate = (models) => {
    Utilisateur.hasMany(models.Logement, { foreignKey: 'proprietaire_id' });
    Utilisateur.hasMany(models.Reservation, { foreignKey: 'locataire_id' });
    Utilisateur.hasMany(models.Transaction, { foreignKey: 'user_id' });
  }

  return Utilisateur;
};