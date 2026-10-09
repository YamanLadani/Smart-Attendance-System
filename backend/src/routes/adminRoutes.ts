import { Router } from 'express';
import {
  getDashboard,
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  updateUserStatus,
  deleteUser,
  getSettings,
  updateSetting,
  getAttendanceAnalytics,
  getAuditLogs,
  getSubjects,
  createSubject,
  updateSubject,
} from '../controllers/adminController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.post('/users/:id/reset-password', resetUserPassword);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

router.get('/settings', getSettings);
router.put('/settings', updateSetting);
router.get('/analytics/attendance', getAttendanceAnalytics);
router.get('/audit-logs', getAuditLogs);

router.get('/subjects', getSubjects);
router.post('/subjects', createSubject);
router.put('/subjects/:id', updateSubject);

export default router;
