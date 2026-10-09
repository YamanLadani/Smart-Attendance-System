import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from '../services/cloudinaryService';

async function testCloudinaryConnection() {
  console.log('--- ☁️  Testing Cloudinary Integration ---');
  console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME ? `Set (${process.env.CLOUDINARY_CLOUD_NAME})` : '❌ Missing');
  console.log('API Key:', process.env.CLOUDINARY_API_KEY ? 'Set (***)' : '❌ Missing');
  console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? 'Set (***)' : '❌ Missing');

  if (!isCloudinaryConfigured()) {
    console.error('\n❌ Cloudinary credentials are not properly configured in backend/.env!');
    process.exit(1);
  }

  console.log('\n✅ Cloudinary configuration detected. Uploading test image buffer...');

  try {
    // Create a 1x1 transparent PNG buffer for testing
    const samplePngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testBuffer = Buffer.from(samplePngBase64, 'base64');

    const result = await uploadBufferToCloudinary(testBuffer, {
      folder: 'smart-attendance/test',
      publicId: `test_connection_${Date.now()}`,
    });

    console.log('\n🎉 Upload Successful!');
    console.log('Public ID:', result.public_id);
    console.log('Secure URL:', result.secure_url);
    console.log('Format:', result.format);
    console.log('Resource Type:', result.resource_type);

    console.log('\nCleaning up test image from Cloudinary...');
    const delResult = await deleteFromCloudinary(result.public_id);
    console.log('Cleanup result:', delResult.result);

    console.log('\n🌟 Cloudinary is 100% WORKING and ready for use!');
  } catch (error: any) {
    console.error('\n❌ Cloudinary Upload Failed:', error.message || error);
    process.exit(1);
  }
}

testCloudinaryConnection();
