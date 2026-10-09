import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/authMiddleware';
import {
  enrollStudent,
  bulkEnroll,
  removeEnrollment,
  getEnrolledStudents,
  getStudentEnrollments,
  getAllEnrollments,
} from '../controllers/enrollmentController';

const router = Router();

// All enrollment routes require authentication
router.use(authenticate);

// Get enrolled students for a subject (teacher/admin)
router.get('/subject/:subjectId/students', authorize('teacher', 'admin'), getEnrolledStudents);

// Get student's enrolled subjects
router.get('/student/:studentId?', getStudentEnrollments);

// Get all enrollments (admin only)
router.get('/', authorize('admin'), getAllEnrollments);

// Enroll a student (student self-enroll, teacher, or admin)
router.post('/', authorize('student', 'teacher', 'admin'), enrollStudent);

// Bulk enroll students (admin)
router.post('/bulk', authorize('admin'), bulkEnroll);

// Remove enrollment (admin)
router.delete('/:id', authorize('admin'), removeEnrollment);

export default router;
