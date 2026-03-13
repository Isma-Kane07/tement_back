'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
require('dotenv').config();

const basename = path.basename(__filename);
const db = {};

// Vérification des variables (pour debug)
console.log('📦 Connexion DB avec:', {
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  // Ne loggez pas le mot de passe !
});

// Config Sequelize - ADAPTÉ POUR RAILWAY
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    port: process.env.DB_PORT || 5432,
    logging: console.log, // Mettez true pour voir les requêtes SQL
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // CRUCIAL pour Railway
      }
    }
  }
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
