import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app-id',
};

const isConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Enable session persistence (remember login across browser sessions)
setPersistence(auth, browserLocalPersistence).catch(console.error);

if (!isConfigured) {
  console.warn(
    '⚠️ Firebase is not configured. Auth features will not work.\n' +
    '   Add VITE_FIREBASE_* environment variables to client/.env'
  );
}

export { auth, isConfigured as isFirebaseConfigured };
export default app;
