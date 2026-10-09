import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  uploadBufferToCloudinary,
  isCloudinaryConfigured,
} from '../services/cloudinaryService';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// Configure Multer memory storage (file is stored in buffer, max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allowed mime types for images
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed!'));
    }
  },
});

/**
 * GET /api/upload/status
 * Check if Cloudinary service is ready and connected
 */
router.get('/status', (_req: Request, res: Response) => {
  const isReady = isCloudinaryConfigured();
  return res.json({
    success: true,
    cloudinaryConfigured: isReady,
    message: isReady
      ? 'Cloudinary is configured and ready to handle media uploads'
      : 'Cloudinary environment variables missing in .env',
  });
});

/**
 * POST /api/upload/avatar
 * Upload user profile picture with auto face-crop
 */
router.post(
  '/avatar',
  upload.single('avatar'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file uploaded' });
      }

      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: 'smart-attendance/avatars',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      });

      return res.json({
        success: true,
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
        },
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (err: any) {
      console.error('Error uploading avatar to Cloudinary:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload avatar',
        message: err?.message || 'Upload error',
      });
    }
  }
);

/**
 * POST /api/upload/image
 * Generic image upload endpoint
 */
router.post(
  '/image',
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file uploaded' });
      }

      const folder = (req.body.folder as string) || 'smart-attendance/general';
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder,
      });

      return res.json({
        success: true,
        data: {
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
        },
        url: result.secure_url,
        publicId: result.public_id,
      });
    } catch (err: any) {
      console.error('Error uploading image to Cloudinary:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload image',
        message: err?.message || 'Upload error',
      });
    }
  }
);

export default router;
