import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { env } from '../config/env';

// Configure Cloudinary SDK
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Check if Cloudinary credentials are fully provided
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  transformation?: any[];
}

/**
 * Upload an in-memory buffer directly to Cloudinary
 * (Ideal for Multer memoryStorage)
 */
export function uploadBufferToCloudinary(
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(
        new Error(
          'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env'
        )
      );
    }

    const folder = options.folder || 'smart-attendance';
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: options.publicId,
        tags: options.tags || ['smart-attendance'],
        resource_type: 'auto',
        transformation: options.transformation || [
          { quality: 'auto', fetch_format: 'auto' }
        ],
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed with unknown error'));
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload a local file path to Cloudinary
 */
export async function uploadFileToCloudinary(
  filePath: string,
  options: UploadOptions = {}
): Promise<UploadApiResponse> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env'
    );
  }

  const folder = options.folder || 'smart-attendance';
  return cloudinary.uploader.upload(filePath, {
    folder,
    public_id: options.publicId,
    tags: options.tags || ['smart-attendance'],
    resource_type: 'auto',
    transformation: options.transformation || [
      { quality: 'auto', fetch_format: 'auto' }
    ],
  });
}

/**
 * Delete a media asset from Cloudinary by its public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<any> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured');
  }
  return cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
