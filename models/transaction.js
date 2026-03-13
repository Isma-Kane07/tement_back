const constants = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define("Transaction", {
    user_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    type: { 
      type: DataTypes.ENUM('revenu_location', 'commission', 'retrait'), 
      allowNull: false 
    },
    montant: { 
      type: DataTypes.FLOAT, 
      allowNull: false,
      validate: { min: 0 }
    },
    description: { 
      type: DataTypes.STRING 
    },
    statut: { 
      type: DataTypes.ENUM('en_attente', 'valide', 'refuse'), 
      defaultValue: 'valide'
    },
    admin_id: { 
  type: DataTypes.INTEGER, 
  allowNull: true // NULL pour les transactions propriétaire, renseigné pour les commissions
},
  });

  Transaction.associate = (models) => {
    Transaction.belongsTo(models.Utilisateur, { foreignKey: 'user_id' });
  };

  return Transaction;
};