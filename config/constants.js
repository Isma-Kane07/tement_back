module.exports = {
  COMMISSION_RATE: 0.15,
  JWT_EXPIRES_IN: '7d',
  ROLES: {
    LOCATAIRE: 'locataire',
    PROPRIETAIRE: 'proprietaire',
    ADMIN: 'admin'
  },
  TRANSACTION_TYPES: {
    REVENU_LOCATION: 'revenu_location',
    COMMISSION: 'commission',
    RETRAIT: 'retrait'
  },
  PAIEMENT_STATUT: {
    EN_ATTENTE: 'en_attente',
    EFFECTUE: 'effectue',
    ECHOUE: 'echoue'
  },
  RESERVATION_STATUT: {
    EN_ATTENTE: 'en_attente',
    CONFIRME: 'confirme',
    PAYE: 'paye',  // ✅ AJOUTER
    ANNULE: 'annule'
  }
};