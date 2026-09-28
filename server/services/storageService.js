const fs = require('fs');
const path = require('path');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');

const uploadDir = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Storage Service - handles uploading and deleting files
 * with transparent Cloudinary / Local filesystem fallback
 */
class StorageService {
  /**
   * Upload file buffer or stream
   * @param {Object} file - Express Multer file object
   * @param {string} folder - Destination folder name
   * @returns {Promise<{ url: string, publicId: string, provider: string }>}
   */
  async uploadFile(file, folder = 'infratrack') {
    if (isCloudinaryConfigured) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `infratrack/${folder}`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              provider: 'cloudinary',
            });
          }
        );
        uploadStream.end(file.buffer);
      });
    }

    // Local file fallback
    const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const destinationPath = path.join(uploadDir, fileName);
    fs.writeFileSync(destinationPath, file.buffer);

    return {
      url: `/uploads/${fileName}`,
      publicId: fileName,
      provider: 'local',
    };
  }

  /**
   * Delete file by publicId / fileName
   * @param {string} publicId
   * @param {string} provider
   */
  async deleteFile(publicId, provider = 'local') {
    if (provider === 'cloudinary' && isCloudinaryConfigured) {
      return cloudinary.uploader.destroy(publicId);
    }

    const filePath = path.join(uploadDir, publicId);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  }
}

module.exports = new StorageService();
