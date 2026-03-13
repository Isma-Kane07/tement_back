const multer = require('multer');
const path = require('path');
const fs = require('fs');

console.log('🔄 Controller upload chargé');

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    console.log('📁 Vérification dossier uploads');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      console.log('📁 Création du dossier uploads');
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = 'photo-' + uniqueSuffix + ext;
    console.log('📸 Nom fichier généré:', filename);
    cb(null, filename);
  }
});

// Filtrer les types de fichiers acceptés
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  console.log('🔍 Vérification fichier - mimetype:', file.mimetype, 'extname:', extname);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Seules les images sont autorisées'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Controller d'upload
exports.uploadPhoto = async (req, res) => {
  console.log('📤 uploadPhoto appelé');
  console.log('req.file:', req.file);
  
  try {
    if (!req.file) {
      console.log('❌ Aucun fichier fourni');
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const photoUrl = `${baseUrl}/uploads/${req.file.filename}`;
    
    console.log('✅ Photo uploadée avec succès:', photoUrl);

    res.status(201).json({
      message: "Photo uploadée avec succès",
      url: photoUrl,
      filename: req.file.filename
    });
  } catch (err) {
    console.error("❌ Erreur upload:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Upload multiple
exports.uploadMultiplePhotos = async (req, res) => {
  console.log('📤 uploadMultiplePhotos appelé');
  console.log('req.files:', req.files?.length);
  
  try {
    if (!req.files || req.files.length === 0) {
      console.log('❌ Aucun fichier fourni');
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const urls = req.files.map(file => ({
      url: `${baseUrl}/uploads/${file.filename}`,
      filename: file.filename
    }));

    console.log(`✅ ${req.files.length} photo(s) uploadée(s)`);

    res.status(201).json({
      message: `${req.files.length} photo(s) uploadée(s) avec succès`,
      urls: urls
    });
  } catch (err) {
    console.error("❌ Erreur upload multiple:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};