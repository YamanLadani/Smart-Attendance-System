import admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Initialize Firebase Admin SDK for server-side token verification.
 * Uses service account credentials from environment variables.
 * Gracefully falls back to dev mode if credentials are not configured.
 */
function initFirebaseAdmin(): admin.app.App {
  try {
    if (admin.apps.length > 0) {
      return admin.apps[0]!;
    }

    // Check if REAL credentials are provided (not just placeholders)
    const hasRealCredentials =
      env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY &&
      !env.FIREBASE_PROJECT_ID.includes('your-') &&
      !env.FIREBASE_PRIVATE_KEY.includes('YOUR_KEY_HERE');

    if (hasRealCredentials) {
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY,
        }),
      });
      logger.info('✅ Firebase Admin SDK initialized with service account');
      return app;
    }

    // Development fallback — init without credentials
    const app = admin.initializeApp({
      projectId: env.FIREBASE_PROJECT_ID || 'demo-project',
    });
    logger.warn('⚠️  Firebase Admin initialized without credentials (dev mode)');
    logger.warn('   Auth endpoints will not work until Firebase credentials are configured.');
    return app;
  } catch (error) {
    logger.error('Firebase Admin initialization failed:', error);
    // Don't crash — init with demo project for development
    const app = admin.initializeApp({
      projectId: 'demo-project',
    });
    logger.warn('⚠️  Firebase fell back to demo mode due to error above.');
    return app;
  }
}

const firebaseAdmin = initFirebaseAdmin();

export { firebaseAdmin, admin };
