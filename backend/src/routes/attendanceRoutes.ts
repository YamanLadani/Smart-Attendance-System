import { Router } from 'express';
import {
  generateAttendanceQR,
  markAttendance,
  manualMarkAttendance,
  correctAttendance,
  getSessionRoster,
  getStudentAttendance,
  getAttendanceStats,
} from '../controllers/attendanceController';
import { authenticate, authorize } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { markAttendanceSchema, generateQRSchema } from '../validators/attendanceValidator';
import { qrScanLimiter } from '../middlewares/rateLimiter';

const router = Router();

// All attendance routes require authentication
router.use(authenticate);

// Teacher generates QR
router.post('/qr/generate', authorize('teacher'), validate(generateQRSchema), generateAttendanceQR);

// Student scans QR to mark attendance (rate-limited)
router.post('/mark', qrScanLimiter, authorize('student'), validate(markAttendanceSchema), markAttendance);

// Teacher manually marks attendance
router.post('/manual', authorize('teacher', 'admin'), manualMarkAttendance);

// Teacher/Admin corrects existing attendance
router.patch('/:id/correct', authorize('teacher', 'admin'), correctAttendance);

// Get session roster (all enrolled students + status)
router.get('/session/:lectureId/roster', authorize('teacher', 'admin'), getSessionRoster);

// Get attendance history
router.get('/history', getStudentAttendance);
router.get('/history/:studentId', authorize('teacher', 'admin'), getStudentAttendance);

// Get attendance statistics
router.get('/stats', getAttendanceStats);
router.get('/stats/:studentId', authorize('teacher', 'admin'), getAttendanceStats);

export default router;
