import { type Request, type Response, type NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { admin } from '../config/firebase-admin';
import { getDB } from '../config/db';
import { users } from '../db/schema';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';
import { env } from '../config/env';
import { verifyToken } from '../utils/jwt';

/**
 * Extended Request interface with authenticated user data.
 */
export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
    userId: string;   // Neon UUID
  };
}

/**
 * Check if Firebase Admin has real credentials configured.
 */
const hasFirebaseCredentials =
  env.FIREBASE_CLIENT_EMAIL &&
  env.FIREBASE_PRIVATE_KEY &&
  !env.FIREBASE_CLIENT_EMAIL.includes('xxxxx') &&
  !env.FIREBASE_PRIVATE_KEY.includes('YOUR_KEY_HERE');

/**
 * Decode a Firebase JWT token WITHOUT verification (dev mode only).
 */
function decodeTokenUnsafe(token: string): { uid: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return {
      uid: payload.user_id || payload.sub || payload.uid,
      email: payload.email,
    };
  } catch {
    return null;
  }
}

/**
 * Try to verify as an application JWT first (from our signToken).
 * Returns the user data if valid, null otherwise.
 */
function tryVerifyAppJwt(token: string): { uid: string; userId: string; email: string; role: string } | null {
  try {
    const payload = verifyToken(token);
    if (payload.userId && payload.email && payload.role) {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Authentication middleware.
 *
 * Supports three token types (tried in order):
 * 1. Application JWT (from our loginWithPassword, googleAuth, etc.)
 * 2. Firebase ID token (verified with Firebase Admin SDK)
 * 3. Firebase ID token (decoded without verification, dev mode only)
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 401, 'Authentication required. Provide a Bearer token.');
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      sendError(res, 401, 'Invalid token format.');
      return;
    }

    // ── Strategy 1: Try as application JWT ──────────────────────────
    const appJwtPayload = tryVerifyAppJwt(token);
    if (appJwtPayload) {
      // Fast path: application JWT contains userId, skip DB lookup by firebaseUid
      const db = getDB();
      const [user] = await db.select().from(users).where(eq(users.id, appJwtPayload.userId)).limit(1);

      if (!user) {
        sendError(res, 404, 'User not found. Please complete registration.');
        return;
      }
      if (!user.isActive) {
        sendError(res, 403, 'Your account has been deactivated. Contact admin.');
        return;
      }

      req.user = {
        uid: appJwtPayload.uid,
        email: user.email,
        role: user.role,      // Always trust DB role, not token role
        userId: user.id,
      };
      next();
      return;
    }

    // ── Strategy 2/3: Firebase token ────────────────────────────────
    let firebaseUid: string | undefined;

    if (hasFirebaseCredentials) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        firebaseUid = decodedToken.uid;
      } catch (firebaseError) {
        logger.error('Firebase token verification failed:', firebaseError);
        sendError(res, 401, 'Invalid or expired token.');
        return;
      }
    } else {
      const decoded = decodeTokenUnsafe(token);
      if (!decoded || !decoded.uid) {
        sendError(res, 401, 'Invalid token.');
        return;
      }
      firebaseUid = decoded.uid;
      logger.debug(`[DEV] Token decoded for uid: ${firebaseUid}`);
    }

    // Find the user in Neon PostgreSQL
    const db = getDB();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.firebaseUid, firebaseUid))
      .limit(1);

    if (!user) {
      sendError(res, 404, 'User not found. Please complete registration.');
      return;
    }

    if (!user.isActive) {
      sendError(res, 403, 'Your account has been deactivated. Contact admin.');
      return;
    }

    // Attach user data to request
    req.user = {
      uid: firebaseUid,
      email: user.email,
      role: user.role,
      userId: user.id,
    };

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    sendError(res, 500, 'Authentication failed.');
  }
};

/**
 * Role-based authorization middleware factory.
 * Usage: authorize('admin', 'teacher')
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 401, 'Authentication required.');
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendError(res, 403, `Access denied. Required role(s): ${roles.join(', ')}`);
      return;
    }

    next();
  };
};
