import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { getDB } from '../config/db';
import { users } from '../db/schema';
import { env } from '../config/env';
import { sendOtpEmail, isSmtpConfigured } from './emailService';
import { logger } from '../utils/logger';

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
function generateOTP(): string {
  const otp = crypto.randomInt(100000, 999999).toString();
  return otp;
}

/**
 * Send an OTP to a user's email.
 * Enforces rate limiting and stores the OTP in the database.
 */
export async function sendOtp(
  email: string,
  purpose: 'verification' | 'password_reset' | 'login'
): Promise<{ success: boolean; message: string }> {
  const db = getDB();

  // Find user
  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);

  if (!user) {
    if (purpose === 'login') {
      return { success: false, message: 'No account found with this email. Please click "Create account" to register.' };
    }
    // For password reset, don't reveal whether user exists for security
    return { success: true, message: 'If an account exists with this email, an OTP has been sent.' };
  }

  // Rate limiting: check cooldown
  if (user.otpLastSentAt) {
    const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
    const timeSinceLastSend = Date.now() - new Date(user.otpLastSentAt).getTime();
    if (timeSinceLastSend < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
      return {
        success: false,
        message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`,
      };
    }
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store OTP in database (overwriting any previous OTP)
  await db.update(users).set({
    otpCode: otp,
    otpExpiresAt: expiresAt,
    otpAttempts: 0,
    otpLastSentAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(users.id, user.id));

  // Send email
  const sent = await sendOtpEmail(user.email, otp, purpose);

  if (!sent) {
    logger.error(`Failed to send OTP email to ${email}`);
    return { success: false, message: 'Failed to send OTP. Please try again.' };
  }

  logger.info(`OTP sent to ${email} for ${purpose}: [${otp}]`);
  return {
    success: true,
    message: isSmtpConfigured()
      ? 'OTP sent successfully! Please check your email inbox.'
      : `[Dev Mode] Your 6-digit OTP is: ${otp} (Configure SMTP in .env for live emails)`,
  };
}

/**
 * Verify an OTP code for a user.
 * Returns the user record if valid.
 */
export async function verifyOtp(
  email: string,
  otp: string
): Promise<{ success: boolean; message: string; userId?: string }> {
  const db = getDB();

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);

  if (!user) {
    return { success: false, message: 'Invalid email or OTP.' };
  }

  // Check max attempts
  if (user.otpAttempts >= env.OTP_MAX_ATTEMPTS) {
    // Invalidate OTP after max attempts
    await db.update(users).set({
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    return { success: false, message: 'Maximum OTP attempts exceeded. Please request a new OTP.' };
  }

  // Check if OTP exists
  if (!user.otpCode || !user.otpExpiresAt) {
    return { success: false, message: 'No OTP found. Please request a new one.' };
  }

  // Check expiry
  if (new Date() > new Date(user.otpExpiresAt)) {
    // Clear expired OTP
    await db.update(users).set({
      otpCode: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  // Increment attempts
  await db.update(users).set({
    otpAttempts: user.otpAttempts + 1,
    updatedAt: new Date(),
  }).where(eq(users.id, user.id));

  // Verify OTP (timing-safe comparison)
  const isValid = crypto.timingSafeEqual(
    Buffer.from(user.otpCode.padEnd(6)),
    Buffer.from(otp.padEnd(6))
  );

  if (!isValid) {
    const remaining = env.OTP_MAX_ATTEMPTS - (user.otpAttempts + 1);
    return {
      success: false,
      message: remaining > 0
        ? `Invalid OTP. ${remaining} attempt(s) remaining.`
        : 'Invalid OTP. Maximum attempts exceeded.',
    };
  }

  // OTP is valid — clear it (one-time use)
  await db.update(users).set({
    otpCode: null,
    otpExpiresAt: null,
    otpAttempts: 0,
    isEmailVerified: true,
    updatedAt: new Date(),
  }).where(eq(users.id, user.id));

  logger.info(`OTP verified successfully for ${email}`);
  return { success: true, message: 'OTP verified successfully.', userId: user.id };
}

/**
 * Send OTP for a user that hasn't been created yet (pre-registration).
 * Stores OTP temporarily in a pending verification map.
 */
const pendingVerifications = new Map<string, { otp: string; expiresAt: number; attempts: number; lastSentAt: number }>();

export async function sendPreRegistrationOtp(email: string): Promise<{ success: boolean; message: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const db = getDB();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
  if (existing) {
    return { success: false, message: 'An account with this email already exists. Please login.' };
  }

  // Rate limiting
  const pending = pendingVerifications.get(normalizedEmail);
  if (pending) {
    const cooldownMs = env.OTP_RESEND_COOLDOWN_SECONDS * 1000;
    const timeSinceLastSend = Date.now() - pending.lastSentAt;
    if (timeSinceLastSend < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
      return { success: false, message: `Please wait ${remaining} seconds before requesting a new OTP.` };
    }
  }

  const otp = generateOTP();
  const expiresAt = Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000;

  pendingVerifications.set(normalizedEmail, { otp, expiresAt, attempts: 0, lastSentAt: Date.now() });

  // Auto-cleanup after expiry + buffer
  setTimeout(() => pendingVerifications.delete(normalizedEmail), (env.OTP_EXPIRY_MINUTES + 1) * 60 * 1000);

  const sent = await sendOtpEmail(normalizedEmail, otp, 'verification');
  if (!sent) {
    return { success: false, message: 'Failed to send OTP. Please try again.' };
  }

  logger.info(`Pre-registration OTP sent to ${normalizedEmail}: [${otp}]`);
  return {
    success: true,
    message: isSmtpConfigured()
      ? 'OTP sent to your email. Please check your inbox.'
      : `[Dev Mode] Your 6-digit OTP is: ${otp} (Configure SMTP in .env for live emails)`,
  };
}

export function verifyPreRegistrationOtp(email: string, otp: string): { success: boolean; message: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const pending = pendingVerifications.get(normalizedEmail);

  if (!pending) {
    return { success: false, message: 'No OTP found. Please request a new one.' };
  }

  if (pending.attempts >= env.OTP_MAX_ATTEMPTS) {
    pendingVerifications.delete(normalizedEmail);
    return { success: false, message: 'Maximum attempts exceeded. Please request a new OTP.' };
  }

  if (Date.now() > pending.expiresAt) {
    pendingVerifications.delete(normalizedEmail);
    return { success: false, message: 'OTP has expired. Please request a new one.' };
  }

  pending.attempts++;

  const isValid = crypto.timingSafeEqual(
    Buffer.from(pending.otp.padEnd(6)),
    Buffer.from(otp.padEnd(6))
  );

  if (!isValid) {
    const remaining = env.OTP_MAX_ATTEMPTS - pending.attempts;
    return {
      success: false,
      message: remaining > 0
        ? `Invalid OTP. ${remaining} attempt(s) remaining.`
        : 'Invalid OTP. Maximum attempts exceeded.',
    };
  }

  // Valid — clean up
  pendingVerifications.delete(normalizedEmail);
  return { success: true, message: 'Email verified successfully.' };
}
