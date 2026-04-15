// controllers/uploadController.js
const cloudinaryService = require('../services/cloudinaryService');

console.log('🔄 Controller upload chargé (Cloudinary)');

// Upload d'une seule photo
exports.uploadPhoto = async (req, res) => {
  console.log('📤 uploadPhoto appelé');
  console.log('req.file:', req.file);
  
  try {
    if (!req.file) {
      console.log('❌ Aucun fichier fourni');
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    const userId = req.user.id;
    const result = await cloudinaryService.uploadProfilePhoto(req.file.buffer, userId);
    
    console.log('✅ Photo uploadée avec succès:', result);

    res.status(201).json({
      message: "Photo uploadée avec succès",
      url: result,
      filename: result.split('/').pop()
    });
  } catch (err) {
    console.error("❌ Erreur upload:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Upload multiple de photos
exports.uploadMultiplePhotos = async (req, res) => {
  console.log('📤 uploadMultiplePhotos appelé');
  console.log('req.files:', req.files?.length);
  
  try {
    if (!req.files || req.files.length === 0) {
      console.log('❌ Aucun fichier fourni');
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    const logementId = req.body.logement_id || Date.now();
    const filesBuffers = req.files.map(file => file.buffer);
    
    const urls = await cloudinaryService.uploadLogementPhotos(filesBuffers, logementId);

    console.log(`✅ ${req.files.length} photo(s) uploadée(s)`);

    res.status(201).json({
      message: `${req.files.length} photo(s) uploadée(s) avec succès`,
      urls: urls.map(url => ({ url: url, filename: url.split('/').pop() }))
    });
  } catch (err) {
    console.error("❌ Erreur upload multiple:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};