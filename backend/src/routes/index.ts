import { Router } from 'express';
import authRoutes from './authRoutes';
import attendanceRoutes from './attendanceRoutes';
import studentRoutes from './studentRoutes';
import teacherRoutes from './teacherRoutes';
import adminRoutes from './adminRoutes';
import timetableRoutes from './timetableRoutes';
import enrollmentRoutes from './enrollmentRoutes';
import geminiRoutes from './geminiRoutes';
import notificationRoutes from './notificationRoutes';
import reportRoutes from './reportRoutes';
import uploadRoutes from './uploadRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/student', studentRoutes);
router.use('/teacher', teacherRoutes);
router.use('/admin', adminRoutes);
router.use('/timetable', timetableRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/gemini', geminiRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/upload', uploadRoutes);

export default router;
