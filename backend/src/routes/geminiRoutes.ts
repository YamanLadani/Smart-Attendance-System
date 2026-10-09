import { Router } from 'express';
import {
  getStudyPlan,
  getRevisionTopics,
  getQuiz,
  getHistory,
  chat,
  getActivityRecommendations,
} from '../controllers/geminiController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

// All Gemini routes require authentication + student role
router.use(authenticate, authorize('student'));

router.post('/study-plan', getStudyPlan);
router.post('/chat', chat);
router.post('/activity-recommendations', getActivityRecommendations);
router.get('/revision/:subject', getRevisionTopics);
router.get('/quiz/:subject', getQuiz);
router.get('/history', getHistory);

export default router;
