import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  deleteNotification,
} from '../controllers/notificationController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/', getNotifications);
router.patch('/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
