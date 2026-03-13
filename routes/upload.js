const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');

console.log('🔄 Route upload chargée'); // Log pour vérifier que le fichier est chargé

// Configuration multer
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'photo-' + uniqueSuffix + path.extname(file.originalname);
    console.log('📸 Fichier reçu:', file.originalname, '->', filename); // Log du fichier
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    console.log('🔍 Vérification fichier:', file.mimetype); // Log du type MIME
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
    console.log('📥 Requête reçue sur /api/upload/photo'); // Log de la requête
    console.log('Headers:', req.headers); // Log des headers
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
    console.log('Headers:', req.headers);
    next();
  },
  upload.array('photos', 10),
  uploadController.uploadMultiplePhotos
);

module.exports = router;