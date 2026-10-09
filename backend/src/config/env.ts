import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  GEMINI_API_KEY: string;
  CLIENT_URL: string;
  // SMTP
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  SMTP_FROM: string;
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  // OTP
  OTP_EXPIRY_MINUTES: number;
  OTP_MAX_ATTEMPTS: number;
  OTP_RESEND_COOLDOWN_SECONDS: number;
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
}

function getEnvVar(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    console.warn(`⚠️  Environment variable ${key} is not set. Using empty string.`);
    return '';
  }
  return value;
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  DATABASE_URL: getEnvVar('DATABASE_URL', ''),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'dev-secret-change-me'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  FIREBASE_PROJECT_ID: getEnvVar('FIREBASE_PROJECT_ID', ''),
  FIREBASE_CLIENT_EMAIL: getEnvVar('FIREBASE_CLIENT_EMAIL', ''),
  FIREBASE_PRIVATE_KEY: getEnvVar('FIREBASE_PRIVATE_KEY', '').replace(/\\n/g, '\n'),
  GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY', ''),
  CLIENT_URL: getEnvVar('CLIENT_URL', 'http://localhost:5173'),
  // SMTP
  SMTP_HOST: getEnvVar('SMTP_HOST', ''),
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: getEnvVar('SMTP_USER', ''),
  SMTP_PASSWORD: getEnvVar('SMTP_PASSWORD', ''),
  SMTP_FROM: getEnvVar('SMTP_FROM', 'Smart Attendance <noreply@smartattendance.com>'),
  // Google OAuth
  GOOGLE_CLIENT_ID: getEnvVar('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: getEnvVar('GOOGLE_CLIENT_SECRET', ''),
  // OTP
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
  OTP_MAX_ATTEMPTS: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  OTP_RESEND_COOLDOWN_SECONDS: parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10),
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: getEnvVar('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: getEnvVar('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: getEnvVar('CLOUDINARY_API_SECRET', ''),
};
