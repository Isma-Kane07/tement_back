// models/index.js
'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
require('dotenv').config();

const basename = path.basename(__filename);
const db = {};

// Détecter si on est sur Railway (ou en production)
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production' || 
                  process.env.NODE_ENV === 'production' ||
                  (process.env.DB_HOST && process.env.DB_HOST.includes('railway.internal'));

console.log('📦 Connexion DB avec:', {
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  environment: isRailway ? 'Railway (SSL activé)' : 'Local (SSL désactivé)'
});

// Configuration de base
let sequelizeConfig = {
  host: process.env.DB_HOST,
  dialect: 'postgres',
  port: process.env.DB_PORT || 5432,
  logging: false, // Mettre à true pour debug
};

// ✅ SSL UNIQUEMENT sur Railway
if (isRailway) {
  sequelizeConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  };
  console.log('🔒 Mode SSL activé pour Railway');
} else {
  console.log('🔓 Mode SSL désactivé pour développement local');
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  sequelizeConfig
);

// Importer tous les modèles du dossier
fs.readdirSync(__dirname)
  .filter(file => file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js')
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

// Relations
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Exporter sequelize et db
db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;