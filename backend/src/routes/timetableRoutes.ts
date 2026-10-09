import { Router } from 'express';
import {
  createTimetable,
  getTimetable,
  getTodaysTimetable,
  updateTimetable,
  deleteTimetable,
  createSubject,
  getSubjects,
} from '../controllers/timetableController';
import { authenticate, authorize } from '../middlewares/authMiddleware';
import { validate } from '../middlewares/validate';
import { createTimetableSchema, updateTimetableSchema } from '../validators/timetableValidator';

const router = Router();

router.use(authenticate);

// Subjects
router.get('/subjects', getSubjects);
router.post('/subjects', authorize('teacher', 'admin'), createSubject);

// Timetable
router.get('/', getTimetable);
router.get('/today', getTodaysTimetable);
router.post('/', authorize('teacher', 'admin'), validate(createTimetableSchema), createTimetable);
router.put('/:id', authorize('teacher', 'admin'), validate(updateTimetableSchema), updateTimetable);
router.delete('/:id', authorize('teacher', 'admin'), deleteTimetable);

export default router;
