import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

interface TokenPayload {
  uid: string;      // Firebase UID or user UUID
  userId: string;   // Neon PostgreSQL UUID (always present)
  email: string;
  role: string;
}

/**
 * Parse a duration string like '7d', '1h', '30m' into seconds.
 */
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 3600; // default 7 days

  const value = parseInt(match[1]!, 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 7 * 86400;
  }
}

/**
 * Sign a JWT token with the user's UID, userId, email, and role.
 */
export const signToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: parseDuration(env.JWT_EXPIRES_IN),
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
};

/**
 * Verify and decode a JWT token.
 */
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};
