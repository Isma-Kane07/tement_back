// routes/upload.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');

console.log('🔄 Route upload chargée (Cloudinary)');

// Configuration multer avec memoryStorage (pas de fichier sur disque)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    console.log('🔍 Vérification fichier:', file.mimetype);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// Route pour uploader une photo
router.post('/photo', 
  authMiddleware, 
  (req, res, next) => {
    console.log('📥 Requête reçue sur /api/upload/photo');
    next();
  },
  upload.single('photo'), 
  uploadController.uploadPhoto
);

// Route pour uploader plusieurs photos
router.post('/photos', 
  authMiddleware, 
  (req, res, next) => {
    console.log('📥 Requête reçue sur /api/upload/photos');
    next();
  },
  upload.array('photos', 10),
  uploadController.uploadMultiplePhotos
);

module.exports = router;