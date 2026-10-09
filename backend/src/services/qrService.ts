import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

interface QRPayload {
  lectureId: string;
  subjectId: string;
  teacherId: string;
  timetableId?: string;
  timestamp: number;
  expiresAt: number;
  token: string;
}

// In-memory store for active QR tokens (production: use Redis)
const activeQRTokens = new Map<string, QRPayload>();

/**
 * Generate a dynamic QR code with embedded lecture data and expiry.
 * Returns both the QR image (data URL) and the payload for verification.
 */
export const generateQR = async (params: {
  subjectId: string;
  teacherId: string;
  timetableId?: string;
  expirySeconds?: number;
}): Promise<{ qrDataUrl: string; payload: QRPayload }> => {
  const { subjectId, teacherId, timetableId, expirySeconds = 30 } = params;

  const now = Date.now();
  const token = uuidv4();
  const lectureId = `LEC-${Date.now()}-${token.slice(0, 8)}`;

  const payload: QRPayload = {
    lectureId,
    subjectId,
    teacherId,
    timetableId,
    timestamp: now,
    expiresAt: now + expirySeconds * 1000,
    token,
  };

  // Store the token for verification
  activeQRTokens.set(token, payload);

  // Auto-remove expired token after expiry + 5s buffer
  setTimeout(() => {
    activeQRTokens.delete(token);
    logger.debug(`QR token expired and cleaned up: ${token.slice(0, 8)}...`);
  }, (expirySeconds + 5) * 1000);

  // Generate QR code as data URL
  const qrData = JSON.stringify(payload);
  const qrDataUrl = await QRCode.toDataURL(qrData, {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });

  logger.info(`QR generated for subject ${subjectId}, expires in ${expirySeconds}s`);

  return { qrDataUrl, payload };
};

/**
 * Verify a scanned QR code's authenticity and check if it's still valid.
 * Returns the payload if valid, or an error message if not.
 */
export const verifyQR = (qrDataString: string): {
  valid: boolean;
  payload?: QRPayload;
  error?: string;
} => {
  try {
    const payload: QRPayload = JSON.parse(qrDataString);

    // Check required fields
    if (!payload.token || !payload.lectureId || !payload.subjectId) {
      return { valid: false, error: 'Invalid QR code format.' };
    }

    // Check if token exists in active store
    const storedPayload = activeQRTokens.get(payload.token);
    if (!storedPayload) {
      return { valid: false, error: 'QR code has expired or is invalid.' };
    }

    // Check expiry
    if (Date.now() > storedPayload.expiresAt) {
      activeQRTokens.delete(payload.token);
      return { valid: false, error: 'QR code has expired.' };
    }

    // Verify data integrity
    if (
      storedPayload.lectureId !== payload.lectureId ||
      storedPayload.subjectId !== payload.subjectId
    ) {
      return { valid: false, error: 'QR code data has been tampered with.' };
    }

    return { valid: true, payload: storedPayload };
  } catch {
    return { valid: false, error: 'Invalid QR code data.' };
  }
};

/**
 * Get remaining time for a QR token in seconds.
 */
export const getQRTimeRemaining = (token: string): number => {
  const payload = activeQRTokens.get(token);
  if (!payload) return 0;
  const remaining = Math.max(0, Math.floor((payload.expiresAt - Date.now()) / 1000));
  return remaining;
};
