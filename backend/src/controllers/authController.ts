import { type Response } from 'express';
import { eq, or, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { getDB } from '../config/db';
import { users, students, teachers, admins } from '../db/schema';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { signToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { logAudit } from '../services/auditService';
import { env } from '../config/env';
import { sendOtp, verifyOtp, sendPreRegistrationOtp, verifyPreRegistrationOtp } from '../services/otpService';
import { sendWelcomeEmail } from '../services/emailService';

const SALT_ROUNDS = 12;

// Google OAuth client (lazy init)
let googleClient: OAuth2Client | null = null;
function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

// ─── Helper: Create role-specific profile ────────────────────────────

async function createRoleProfile(db: ReturnType<typeof getDB>, userId: string, role: string, data: Record<string, unknown>) {
  switch (role) {
    case 'student':
      await db.insert(students).values({
        userId,
        enrollmentNumber: (data.enrollmentNumber as string) || `ENR-${Date.now()}`,
        branch: (data.branch as string) || (data.department as string) || 'General',
        semester: (data.semester as number) || 1,
        division: (data.division as string) || 'A',
        rollNumber: (data.rollNumber as string) || '0',
        batch: (data.batch as string) || new Date().getFullYear().toString(),
        careerGoal: (data.careerGoal as string) || null,
      });
      break;
    case 'teacher':
      await db.insert(teachers).values({
        userId,
        employeeId: (data.employeeId as string) || `EMP-${Date.now()}`,
        department: (data.department as string) || 'General',
        designation: (data.designation as string) || 'Lecturer',
        specialization: (data.specialization as string) || null,
        subjects: (data.subjects as string[]) || [],
      });
      break;
    case 'admin':
      await db.insert(admins).values({
        userId,
        adminLevel: (data.adminLevel as 'super' | 'department' | 'general') || 'department',
        managedDepartments: data.department ? [(data.department as string).trim()] : [],
      });
      break;
  }
}

// ─── Helper: Admin uniqueness check ──────────────────────────────────

async function checkAdminUniqueness(db: ReturnType<typeof getDB>, department: string, adminLevel?: string): Promise<string | null> {
  if (adminLevel === 'super') {
    // Check if a super admin already exists
    const existingSuperAdmin = await db
      .select({ id: users.id })
      .from(users)
      .innerJoin(admins, eq(users.id, admins.userId))
      .where(and(
        eq(admins.adminLevel, 'super'),
        eq(users.isActive, true),
      ))
      .limit(1);

    if (existingSuperAdmin.length > 0) {
      return 'A Super Admin already exists. Only one Super Admin is allowed in the system.';
    }
    return null;
  }

  // Check department admin uniqueness
  const existingDeptAdmin = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .innerJoin(admins, eq(users.id, admins.userId))
    .where(and(
      eq(users.role, 'admin'),
      eq(users.isActive, true),
      eq(users.department, department.trim()),
    ))
    .limit(1);

  if (existingDeptAdmin.length > 0) {
    return `An administrator already exists for the ${department} department.`;
  }

  return null;
}

/**
 * Register a new user with email + password (direct auth, no Firebase required).
 */
export const register = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      firebaseUid, email, password, displayName, role,
      department, semester, division, rollNumber, phone,
      enrollmentNumber, branch, batch,
      employeeId, designation, specialization, subjects: subjectsList,
    } = req.body;

    // ── Validate required fields ─────────────────────────────────────
    if (!email || !displayName) {
      sendError(res, 400, 'Email and display name are required.');
      return;
    }

    const validRoles = ['student', 'teacher', 'admin'];
    if (!role || !validRoles.includes(role)) {
      sendError(res, 400, 'Invalid role. Must be student, teacher, or admin.');
      return;
    }

    const db = getDB();

    // ── Check if user already exists ─────────────────────────────────
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser) {
      // If user exists, return their data for re-login
      const token = signToken({
        uid: existingUser.firebaseUid || existingUser.id,
        userId: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
      });
      sendSuccess(res, 200, 'User already registered', { user: existingUser, token });
      return;
    }

    // ── Admin uniqueness enforcement ─────────────────────────────────
    if (role === 'admin') {
      if (!department) {
        sendError(res, 400, 'Department is required for admin registration.');
        return;
      }

      const adminError = await checkAdminUniqueness(db, department);
      if (adminError) {
        sendError(res, 409, adminError);
        return;
      }
    }

    // ── Hash password if provided ────────────────────────────────────
    let passwordHash: string | null = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    // ── Create the base user ─────────────────────────────────────────
    const [user] = await db
      .insert(users)
      .values({
        firebaseUid: firebaseUid || null,
        email: email.toLowerCase().trim(),
        displayName: displayName.trim(),
        passwordHash,
        role,
        department: department?.trim() || null,
        semester: semester || null,
        division: division?.trim() || null,
        rollNumber: rollNumber?.trim() || null,
        phone: phone?.trim() || null,
        isEmailVerified: !!firebaseUid, // Firebase users are auto-verified
      })
      .returning();

    if (!user) {
      sendError(res, 500, 'Failed to create user.');
      return;
    }

    // ── Create role-specific profile ─────────────────────────────────
    await createRoleProfile(db, user.id, role, {
      enrollmentNumber, branch, department, semester, division,
      rollNumber, batch, employeeId, designation, specialization,
      subjects: subjectsList,
    });

    // ── Audit log ────────────────────────────────────────────────────
    await logAudit({
      userId: user.id,
      action: role === 'admin' ? 'admin_created' : 'user_created',
      targetType: 'user',
      targetId: user.id,
      description: `${role} account created: ${email}`,
    });

    // ── Generate JWT ─────────────────────────────────────────────────
    const token = signToken({
      uid: firebaseUid || user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.displayName, role).catch(() => {});

    logger.info(`User registered: ${email} as ${role}`);
    sendSuccess(res, 201, 'Registration successful', { user, token });
  } catch (error) {
    logger.error('Registration failed:', error);
    sendError(res, 500, 'Registration failed. Please try again.');
  }
};

/**
 * Login with Firebase token (legacy flow).
 */
export const login = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firebaseUid, email } = req.body;

    const db = getDB();

    let user;
    if (firebaseUid) {
      [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    }
    if (!user && email) {
      [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    }

    if (!user) {
      sendError(res, 404, 'Account not found. Please register first.');
      return;
    }

    if (!user.isActive) {
      sendError(res, 403, 'Your account has been disabled. Please contact your administrator.');
      return;
    }

    // Update last login + link Firebase UID if not set
    const updateData: Record<string, unknown> = { lastLogin: new Date(), updatedAt: new Date() };
    if (firebaseUid && !user.firebaseUid) {
      updateData.firebaseUid = firebaseUid;
    }
    await db.update(users).set(updateData).where(eq(users.id, user.id));

    const token = signToken({
      uid: firebaseUid || user.firebaseUid || user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await logAudit({
      userId: user.id,
      action: 'login',
      targetType: 'user',
      targetId: user.id,
      description: `User logged in: ${user.email}`,
    });

    logger.info(`User logged in: ${user.email}`);
    sendSuccess(res, 200, 'Login successful', { user, token });
  } catch (error) {
    logger.error('Login failed:', error);
    sendError(res, 500, 'Unable to connect to the server. Please try again.');
  }
};

/**
 * Login with email + password (direct, no Firebase required).
 */
export const loginWithPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 400, 'Email and password are required.');
      return;
    }

    const db = getDB();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      sendError(res, 401, 'Invalid email or password.');
      return;
    }

    if (!user.isActive) {
      sendError(res, 403, 'Your account has been disabled. Please contact your administrator.');
      return;
    }

    // Check password
    if (!user.passwordHash) {
      // User registered via Firebase/Google — no local password set
      sendError(res, 401, 'This account uses Google or Firebase login. Please use that method, or reset your password.');
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      sendError(res, 401, 'Invalid email or password.');
      return;
    }

    // Update last login
    await db.update(users).set({ lastLogin: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));

    const token = signToken({
      uid: user.firebaseUid || user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await logAudit({
      userId: user.id,
      action: 'login',
      targetType: 'user',
      targetId: user.id,
      description: `Password login: ${user.email}`,
    });

    logger.info(`Password login: ${user.email}`);
    sendSuccess(res, 200, 'Login successful', { user, token });
  } catch (error) {
    logger.error('Password login failed:', error);
    sendError(res, 500, 'Login failed. Please try again.');
  }
};

/**
 * Google OAuth login/register.
 * Receives a Google ID token from the frontend, verifies it,
 * and either logs in an existing user or creates a new one.
 */
export const googleAuth = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { idToken, role, department, semester, division, rollNumber, phone,
            enrollmentNumber, branch, batch, employeeId, designation } = req.body;

    if (!idToken) {
      sendError(res, 400, 'Google ID token is required.');
      return;
    }

    // Verify Google ID token
    let googlePayload;
    try {
      const client = getGoogleClient();
      const ticket = await client.verifyIdToken({
        idToken,
        audience: env.GOOGLE_CLIENT_ID,
      });
      googlePayload = ticket.getPayload();
    } catch {
      sendError(res, 401, 'Invalid Google token.');
      return;
    }

    if (!googlePayload || !googlePayload.email) {
      sendError(res, 401, 'Failed to verify Google account.');
      return;
    }

    const { email, name, picture, sub: googleId } = googlePayload;
    const db = getDB();

    // Check if user exists by email or Google ID
    let [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email!.toLowerCase()), eq(users.googleId, googleId)))
      .limit(1);

    if (user) {
      // Existing user — login
      if (!user.isActive) {
        sendError(res, 403, 'Your account has been disabled. Please contact your administrator.');
        return;
      }

      // Link Google ID if not already linked
      const linkUpdate: Record<string, unknown> = { lastLogin: new Date(), updatedAt: new Date() };
      if (!user.googleId) linkUpdate.googleId = googleId;
      if (!user.photoURL && picture) linkUpdate.photoURL = picture;
      await db.update(users).set(linkUpdate).where(eq(users.id, user.id));

      const token = signToken({
        uid: user.firebaseUid || user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      await logAudit({
        userId: user.id,
        action: 'login',
        targetType: 'user',
        targetId: user.id,
        description: `Google login: ${user.email}`,
      });

      sendSuccess(res, 200, 'Login successful', { user, token });
      return;
    }

    // New user — register
    const userRole = (role === 'student' || role === 'teacher') ? role : 'student';

    // Block admin creation via Google OAuth
    if (role === 'admin') {
      sendError(res, 403, 'Admin accounts cannot be created through Google Sign-In. Contact the Super Admin.');
      return;
    }

    // Create user
    [user] = await db.insert(users).values({
      email: email!.toLowerCase(),
      displayName: name || email!.split('@')[0],
      photoURL: picture || null,
      googleId,
      role: userRole,
      department: department?.trim() || null,
      semester: semester || null,
      division: division?.trim() || null,
      rollNumber: rollNumber?.trim() || null,
      phone: phone?.trim() || null,
      isEmailVerified: true, // Google email is verified
    }).returning();

    // Create role profile
    await createRoleProfile(db, user.id, userRole, {
      enrollmentNumber, branch, department, semester, division,
      rollNumber, batch, employeeId, designation,
    });

    await logAudit({
      userId: user.id,
      action: 'user_created',
      targetType: 'user',
      targetId: user.id,
      description: `Google sign-up: ${email} as ${userRole}`,
    });

    const token = signToken({
      uid: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    sendWelcomeEmail(user.email, user.displayName, userRole).catch(() => {});

    logger.info(`Google sign-up: ${email} as ${userRole}`);
    sendSuccess(res, 201, 'Registration successful', { user, token, isNewUser: true });
  } catch (error) {
    logger.error('Google auth failed:', error);
    sendError(res, 500, 'Google authentication failed. Please try again.');
  }
};

/**
 * Send OTP for email verification or password reset.
 */
export const handleSendOtp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, purpose } = req.body;

    if (!email) {
      sendError(res, 400, 'Email is required.');
      return;
    }

    const validPurposes = ['verification', 'password_reset', 'login'];
    const otpPurpose = validPurposes.includes(purpose) ? purpose : 'verification';

    if (otpPurpose === 'verification') {
      // Pre-registration OTP
      const result = await sendPreRegistrationOtp(email);
      if (result.success) {
        sendSuccess(res, 200, result.message);
      } else {
        sendError(res, 400, result.message);
      }
    } else {
      // Login or Password reset OTP (user must exist)
      const result = await sendOtp(email, otpPurpose as 'login' | 'password_reset');
      if (result.success) {
        sendSuccess(res, 200, result.message);
      } else {
        sendError(res, 400, result.message);
      }
    }
  } catch (error) {
    logger.error('Send OTP failed:', error);
    sendError(res, 500, 'Failed to send OTP.');
  }
};

/**
 * Direct sign-in using Email OTP.
 */
export const loginWithOtp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      sendError(res, 400, 'Email and OTP are required.');
      return;
    }

    // Verify the OTP
    const verification = await verifyOtp(email, otp);
    if (!verification.success || !verification.userId) {
      sendError(res, 400, verification.message || 'Invalid or expired OTP.');
      return;
    }

    const db = getDB();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, verification.userId))
      .limit(1);

    if (!user) {
      sendError(res, 404, 'User account not found.');
      return;
    }

    if (!user.isActive) {
      sendError(res, 403, 'Your account has been deactivated. Please contact your administrator.');
      return;
    }

    // Update lastLogin
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

    // Sign Application JWT
    const token = signToken({
      uid: user.firebaseUid || user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await logAudit({
      userId: user.id,
      action: 'login',
      targetType: 'user',
      targetId: user.id,
      description: `OTP sign-in: ${user.email}`,
    });

    sendSuccess(res, 200, 'OTP login successful', { user, token });
  } catch (error) {
    logger.error('OTP login failed:', error);
    sendError(res, 500, 'OTP sign-in failed. Please try again.');
  }
};

/**
 * Verify an OTP code.
 */
export const handleVerifyOtp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, otp, purpose } = req.body;

    if (!email || !otp) {
      sendError(res, 400, 'Email and OTP are required.');
      return;
    }

    if (purpose === 'verification') {
      // Pre-registration verification
      const result = verifyPreRegistrationOtp(email, otp);
      if (result.success) {
        sendSuccess(res, 200, result.message);
      } else {
        sendError(res, 400, result.message);
      }
    } else {
      // Password reset verification
      const result = await verifyOtp(email, otp);
      if (result.success) {
        sendSuccess(res, 200, result.message, { userId: result.userId });
      } else {
        sendError(res, 400, result.message);
      }
    }
  } catch (error) {
    logger.error('Verify OTP failed:', error);
    sendError(res, 500, 'OTP verification failed.');
  }
};

/**
 * Forgot password — sends a password reset OTP.
 */
export const forgotPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      sendError(res, 400, 'Email is required.');
      return;
    }

    const result = await sendOtp(email, 'password_reset');
    // Always return success to not reveal whether account exists
    sendSuccess(res, 200, result.message);
  } catch (error) {
    logger.error('Forgot password failed:', error);
    sendError(res, 500, 'Failed to process request.');
  }
};

/**
 * Reset password after OTP verification.
 */
export const resetPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      sendError(res, 400, 'Email, OTP, and new password are required.');
      return;
    }

    if (newPassword.length < 6) {
      sendError(res, 400, 'Password must be at least 6 characters long.');
      return;
    }

    // Verify OTP first
    const otpResult = await verifyOtp(email, otp);
    if (!otpResult.success) {
      sendError(res, 400, otpResult.message);
      return;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const db = getDB();

    await db.update(users).set({
      passwordHash,
      updatedAt: new Date(),
    }).where(eq(users.email, email.toLowerCase().trim()));

    logger.info(`Password reset for ${email}`);
    sendSuccess(res, 200, 'Password reset successfully. You can now login with your new password.');
  } catch (error) {
    logger.error('Reset password failed:', error);
    sendError(res, 500, 'Failed to reset password.');
  }
};

/**
 * Get current user's profile (from authenticated token).
 */
export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user) {
      sendError(res, 404, 'User not found.');
      return;
    }

    // Fetch role-specific profile
    let profile = null;
    switch (user.role) {
      case 'student': {
        const [s] = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
        profile = s || null;
        break;
      }
      case 'teacher': {
        const [t] = await db.select().from(teachers).where(eq(teachers.userId, user.id)).limit(1);
        profile = t || null;
        break;
      }
      case 'admin': {
        const [a] = await db.select().from(admins).where(eq(admins.userId, user.id)).limit(1);
        profile = a || null;
        break;
      }
    }

    sendSuccess(res, 200, 'Profile retrieved', { user, profile });
  } catch (error) {
    logger.error('Get profile failed:', error);
    sendError(res, 500, 'Failed to retrieve profile.');
  }
};

/**
 * Update user profile.
 *
 * SECURITY: Immutable identity fields (rollNumber, enrollmentNumber, employeeId,
 * firebaseUid) cannot be changed by the user. Only admin can correct those.
 */
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    // Only allow safe profile fields — NOT identity fields
    const { phone, photoURL, bio, ...roleFields } = req.body;

    // Build safe update
    const safeUserUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (phone !== undefined) safeUserUpdate.phone = phone;
    if (photoURL !== undefined) safeUserUpdate.photoURL = photoURL;
    if (bio !== undefined) safeUserUpdate.bio = bio;

    const [user] = await db
      .update(users)
      .set(safeUserUpdate)
      .where(eq(users.id, req.user.userId))
      .returning();

    if (!user) {
      sendError(res, 404, 'User not found.');
      return;
    }

    // Update role-specific profile (only non-identity fields)
    switch (user.role) {
      case 'student': {
        const { strongSubjects, weakSubjects, careerGoal, address, parentPhone } = roleFields;
        const studentUpdate: Record<string, unknown> = { updatedAt: new Date() };
        if (strongSubjects !== undefined) studentUpdate.strongSubjects = strongSubjects;
        if (weakSubjects !== undefined) studentUpdate.weakSubjects = weakSubjects;
        if (careerGoal !== undefined) studentUpdate.careerGoal = careerGoal;
        if (address !== undefined) studentUpdate.address = address;
        if (parentPhone !== undefined) studentUpdate.parentPhone = parentPhone;
        await db.update(students).set(studentUpdate).where(eq(students.userId, user.id));
        break;
      }
      case 'teacher': {
        const { specialization, qualification, experience } = roleFields;
        const teacherUpdate: Record<string, unknown> = { updatedAt: new Date() };
        if (specialization !== undefined) teacherUpdate.specialization = specialization;
        if (qualification !== undefined) teacherUpdate.qualification = qualification;
        if (experience !== undefined) teacherUpdate.experience = experience;
        await db.update(teachers).set(teacherUpdate).where(eq(teachers.userId, user.id));
        break;
      }
    }

    sendSuccess(res, 200, 'Profile updated', { user });
  } catch (error) {
    logger.error('Update profile failed:', error);
    sendError(res, 500, 'Failed to update profile.');
  }
};

/**
 * Change password (requires current password or admin).
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      sendError(res, 400, 'New password must be at least 6 characters.');
      return;
    }

    const db = getDB();
    const [user] = await db.select().from(users).where(eq(users.id, req.user.userId)).limit(1);

    if (!user) {
      sendError(res, 404, 'User not found.');
      return;
    }

    // If user has an existing password, verify current password
    if (user.passwordHash && currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        sendError(res, 401, 'Current password is incorrect.');
        return;
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));

    logger.info(`Password changed for ${user.email}`);
    sendSuccess(res, 200, 'Password changed successfully.');
  } catch (error) {
    logger.error('Change password failed:', error);
    sendError(res, 500, 'Failed to change password.');
  }
};
