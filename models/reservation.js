const constants = require('../config/constants');

module.exports = (sequelize, DataTypes) => {
  const Reservation = sequelize.define("Reservation", {
    logement_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    locataire_id: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    date_debut: { 
      type: DataTypes.DATEONLY, 
      allowNull: false 
    },
    date_fin: { 
      type: DataTypes.DATEONLY, 
      allowNull: false,
      validate: {
        isAfterDateDebut(value) {
          if (new Date(value) <= new Date(this.date_debut)) {
            throw new Error('La date de fin doit être après la date de début');
          }
        }
      }
    },
    montant_total: { 
      type: DataTypes.FLOAT, 
      allowNull: false,
      validate: { min: 0 }
    },
    statut: { 
      // ✅ AJOUTER 'paye' dans l'ENUM
      type: DataTypes.ENUM('en_attente', 'confirme', 'paye', 'annule'), 
      defaultValue: constants.RESERVATION_STATUT.EN_ATTENTE
    }
  });

  Reservation.associate = (models) => {
    Reservation.belongsTo(models.Logement, { foreignKey: 'logement_id' });
    Reservation.belongsTo(models.Utilisateur, { foreignKey: 'locataire_id' });
    Reservation.hasOne(models.Paiement, { foreignKey: 'reservation_id' });
  }

  return Reservation;
};