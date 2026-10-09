import { Router } from 'express';
import {
  register,
  login,
  loginWithPassword,
  loginWithOtp,
  googleAuth,
  getProfile,
  updateProfile,
  handleSendOtp,
  handleVerifyOtp,
  forgotPassword,
  resetPassword,
  changePassword,
} from '../controllers/authController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// ─── Public Auth Routes ──────────────────────────────────────────────
router.post('/register', register);
router.post('/login', login);                       // Firebase token login (legacy)
router.post('/login-password', loginWithPassword);   // Email + password login (new)
router.post('/login-otp', loginWithOtp);             // Email + OTP direct sign-in
router.post('/google', googleAuth);                  // Google OAuth

// ─── OTP Routes ──────────────────────────────────────────────────────
router.post('/send-otp', handleSendOtp);
router.post('/verify-otp', handleVerifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ─── Protected Routes ────────────────────────────────────────────────
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.post('/change-password', authenticate, changePassword);

export default router;
