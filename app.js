// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const db = require('./models');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

console.log('🚀 Démarrage du serveur...');

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques
app.use('/uploads', express.static('uploads'));
console.log('📁 Dossier uploads servi');

// Routes API - TOUTES les routes sont dans routes/index.js
app.use('/api', routes);
console.log('🛣️ Routes montées sur /api');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route non trouvée:', req.method, req.url);
  res.status(404).json({ message: 'Route non trouvée' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err);
  res.status(500).json({ 
    message: 'Erreur serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Démarrage
const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ DB connectée');
    
    await db.sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ DB synchronisée');
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur sur http://localhost:${PORT}`);
      console.log(`📚 API sur http://localhost:${PORT}/api`);
      console.log(`📤 Upload sur http://localhost:${PORT}/api/upload`);
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
};

startServer();