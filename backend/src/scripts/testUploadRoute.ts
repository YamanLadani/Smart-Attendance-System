import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function testUploadEndpoint() {
  console.log('--- Testing /api/upload/avatar Endpoint ---');
  
  // 1. Check /api/upload/status
  try {
    const statusRes = await fetch('http://127.0.0.1:5000/api/upload/status');
    const statusData = await statusRes.json();
    console.log('Upload Status Check:', statusRes.status, statusData);
  } catch (err: any) {
    console.error('Failed to connect to backend on port 5000. Is backend running?', err.message);
    return;
  }

  // 2. Test FormData upload to /api/upload/avatar
  try {
    const samplePngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = new Blob([Buffer.from(samplePngBase64, 'base64')], { type: 'image/png' });
    const formData = new FormData();
    formData.append('avatar', blob, 'test.png');

    const uploadRes = await fetch('http://127.0.0.1:5000/api/upload/avatar', {
      method: 'POST',
      body: formData,
    });

    const uploadData = await uploadRes.json();
    console.log('Upload Avatar Status:', uploadRes.status);
    console.log('Upload Avatar Response:', uploadData);
  } catch (err: any) {
    console.error('Upload request failed:', err.message);
  }
}

testUploadEndpoint();
