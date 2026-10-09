import { Router } from 'express';
import {
  getDashboard,
  getGoals,
  createGoal,
  updateGoal,
  getBookmarks,
  toggleBookmark,
  getStudentNotes,
} from '../controllers/studentController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

// All student routes require authentication + student role
router.use(authenticate, authorize('student'));

router.get('/dashboard', getDashboard);
router.get('/goals', getGoals);
router.post('/goals', createGoal);
router.put('/goals/:id', updateGoal);
router.get('/bookmarks', getBookmarks);
router.patch('/bookmarks/:id/toggle', toggleBookmark);

// Student notes endpoint
router.get('/notes', getStudentNotes);

export default router;
