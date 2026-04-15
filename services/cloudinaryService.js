// services/cloudinaryService.js
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

console.log('🔄 Service Cloudinary chargé');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dp5cablma',
  api_key: process.env.CLOUDINARY_API_KEY || '933419699187444',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'q9DxaUjjyoQtqSKscRzPydyjx3g',
});

console.log('✅ Cloudinary configuré');

/**
 * Upload d'un fichier depuis un buffer
 */
const uploadFromBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'tement',
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Upload d'une photo de profil
 */
const uploadProfilePhoto = async (fileBuffer, userId) => {
  try {
    const result = await uploadFromBuffer(fileBuffer, {
      folder: 'tement/profiles',
      public_id: `user_${userId}_${Date.now()}`,
      transformation: [
        { width: 300, height: 300, crop: 'fill', gravity: 'face' },
        { quality: 'auto' }
      ]
    });
    console.log(`✅ Profile photo uploadée pour user ${userId}`);
    return result.secure_url;
  } catch (error) {
    console.error('❌ Erreur upload profile:', error);
    throw error;
  }
};

/**
 * Upload de photos de logement
 */
const uploadLogementPhotos = async (filesBuffers, logementId) => {
  try {
    const uploadPromises = filesBuffers.map((buffer, index) => 
      uploadFromBuffer(buffer, {
        folder: 'tement/logements',
        public_id: `logement_${logementId}_${Date.now()}_${index}`,
        transformation: [
          { width: 800, height: 600, crop: 'fill' },
          { quality: 'auto' }
        ]
      })
    );
    
    const results = await Promise.all(uploadPromises);
    console.log(`✅ ${results.length} photos uploadées pour logement ${logementId}`);
    return results.map(r => r.secure_url);
  } catch (error) {
    console.error('❌ Erreur upload logement photos:', error);
    throw error;
  }
};

/**
 * Supprimer une image
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`✅ Image supprimée: ${publicId}`);
    return result;
  } catch (error) {
    console.error('❌ Erreur suppression image:', error);
    throw error;
  }
};

module.exports = {
  cloudinary,
  uploadFromBuffer,
  uploadProfilePhoto,
  uploadLogementPhotos,
  deleteImage,
};