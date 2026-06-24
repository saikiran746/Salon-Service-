const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs = require('fs');

// Ensure local uploads directories exist
const uploadsDir = path.join(__dirname, '../../uploads');
const servicesDir = path.join(uploadsDir, 'services');
const staffDir = path.join(uploadsDir, 'staff');
const galleryDir = path.join(uploadsDir, 'gallery');

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(servicesDir, { recursive: true });
fs.mkdirSync(staffDir, { recursive: true });
fs.mkdirSync(galleryDir, { recursive: true });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key';

let uploadServiceRaw, uploadStaffRaw, uploadGalleryRaw;

if (isCloudinaryConfigured) {
  const serviceStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'salon/services', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], transformation: [{ width: 800, height: 600, crop: 'fill' }] },
  });

  const staffStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: 'salon/staff', allowed_formats: ['jpg', 'jpeg', 'png', 'webp'], transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }] },
  });

  const galleryStorage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
      folder: 'salon/gallery',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'],
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
    }),
  });

  uploadServiceRaw = multer({ storage: serviceStorage, limits: { fileSize: 5 * 1024 * 1024 } });
  uploadStaffRaw = multer({ storage: staffStorage, limits: { fileSize: 5 * 1024 * 1024 } });
  uploadGalleryRaw = multer({ storage: galleryStorage, limits: { fileSize: 50 * 1024 * 1024 } });
} else {
  // Configured local DiskStorage
  const createDiskStorage = (folder) => {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, path.join(uploadsDir, folder));
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, folder + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
  };

  uploadServiceRaw = multer({ storage: createDiskStorage('services'), limits: { fileSize: 5 * 1024 * 1024 } });
  uploadStaffRaw = multer({ storage: createDiskStorage('staff'), limits: { fileSize: 5 * 1024 * 1024 } });
  uploadGalleryRaw = multer({ storage: createDiskStorage('gallery'), limits: { fileSize: 50 * 1024 * 1024 } });
}

// Helper to wrap raw multer instance and map relative file path to full web URL dynamically
const makeMulterProxy = (multerInstance, folder) => {
  return {
    single: (fieldName) => {
      return (req, res, next) => {
        multerInstance.single(fieldName)(req, res, (err) => {
          if (err) return next(err);
          if (req.file && !isCloudinaryConfigured) {
            const host = req.protocol + '://' + req.get('host');
            req.file.path = host + '/uploads/' + folder + '/' + req.file.filename;
          }
          next();
        });
      };
    },
    array: (fieldName, maxCount) => {
      return (req, res, next) => {
        multerInstance.array(fieldName, maxCount)(req, res, (err) => {
          if (err) return next(err);
          if (req.files && !isCloudinaryConfigured) {
            const host = req.protocol + '://' + req.get('host');
            req.files.forEach(f => {
              f.path = host + '/uploads/' + folder + '/' + f.filename;
            });
          }
          next();
        });
      };
    },
    fields: (fieldsArray) => {
      return (req, res, next) => {
        multerInstance.fields(fieldsArray)(req, res, (err) => {
          if (err) return next(err);
          if (req.files && !isCloudinaryConfigured) {
            const host = req.protocol + '://' + req.get('host');
            Object.keys(req.files).forEach(key => {
              req.files[key].forEach(f => {
                f.path = host + '/uploads/' + folder + '/' + f.filename;
              });
            });
          }
          next();
        });
      };
    }
  };
};

const uploadService = makeMulterProxy(uploadServiceRaw, 'services');
const uploadStaff = makeMulterProxy(uploadStaffRaw, 'staff');
const uploadGallery = makeMulterProxy(uploadGalleryRaw, 'gallery');

const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  if (!isCloudinaryConfigured) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

module.exports = { uploadService, uploadStaff, uploadGallery, deleteFromCloudinary, cloudinary };
