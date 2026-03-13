const constants = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const Paiement = sequelize.define("Paiement", {
    reservation_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    methode: { 
      type: DataTypes.STRING,
      validate: {
        isIn: [['carte', 'orange_money', 'moov_money', 'mtn_money']]
      }
    },
    montant_total: { 
      type: DataTypes.FLOAT, 
      allowNull: false,
      validate: { min: 0 }
    },
    commission_tement: { 
      type: DataTypes.FLOAT, 
      allowNull: false,
      validate: { min: 0 }
    },
    net_proprietaire: { 
      type: DataTypes.FLOAT, 
      allowNull: false,
      validate: { min: 0 }
    },
    reference_transaction: { 
      type: DataTypes.STRING,
      unique: true
    },
    statut: { 
      type: DataTypes.ENUM('en_attente', 'effectue', 'echoue'), 
      defaultValue: constants.PAIEMENT_STATUT.EN_ATTENTE
    },
    date_paiement: { 
      type: DataTypes.DATE 
    }
  });

  Paiement.associate = (models) => {
    Paiement.belongsTo(models.Reservation, { foreignKey: 'reservation_id' });
  }

  return Paiement;
};