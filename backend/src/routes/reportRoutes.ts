import { Router } from 'express';
import { downloadPDFReport, downloadCSVReport } from '../controllers/reportController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

// Allow student, teacher, and admin to download reports (controllers enforce role-based scoping)
router.use(authenticate, authorize('student', 'teacher', 'admin'));

router.get('/pdf', downloadPDFReport);
router.get('/csv', downloadCSVReport);

export default router;
