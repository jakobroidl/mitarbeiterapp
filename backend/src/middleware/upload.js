const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

// Ensure upload directory exists
const ensureUploadDir = async (dir) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profiles');
    await ensureUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Nur Bilddateien sind erlaubt (JPEG, PNG, GIF, WebP)'));
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        message: 'Datei ist zu groß. Maximale Größe: 5MB' 
      });
    }
    return res.status(400).json({ 
      message: 'Fehler beim Datei-Upload', 
      error: err.message 
    });
  } else if (err) {
    return res.status(400).json({ 
      message: err.message || 'Fehler beim Datei-Upload' 
    });
  }
  next();
};

// Delete file utility
const deleteFile = async (filename) => {
  if (!filename) return;
  
  try {
    const filepath = path.join(__dirname, '../../uploads/profiles', filename);
    await fs.unlink(filepath);
  } catch (error) {
    console.error('Fehler beim Löschen der Datei:', error);
  }
};

// Get file URL
const getFileUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/profiles/${filename}`;
};

module.exports = {
  upload,
  handleUploadError,
  deleteFile,
  getFileUrl,
  ensureUploadDir
};
