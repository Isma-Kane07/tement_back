module.exports = (sequelize, DataTypes) => {
  const Logement = sequelize.define("Logement", {
    proprietaire_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    type: { 
      type: DataTypes.ENUM('maison', 'appartement', 'studio'), 
      allowNull: false 
    },
    adresse: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    description: { 
      type: DataTypes.TEXT 
    },
    prix_nuit: { 
      type: DataTypes.FLOAT, 
      allowNull: false,
      validate: { min: 0 }
    },
    photos: { 
      type: DataTypes.JSON,
      defaultValue: []
    },
    disponible: { 
      type: DataTypes.BOOLEAN, 
      defaultValue: true 
    }
  });

  Logement.associate = (models) => {
    Logement.belongsTo(models.Utilisateur, { foreignKey: 'proprietaire_id' });
    Logement.hasMany(models.Reservation, { foreignKey: 'logement_id' });
  }

  return Logement;
};