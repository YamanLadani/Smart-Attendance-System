import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getDashboard,
  searchStudents,
  getStudentsBySubject,
  getClassStudents,
  uploadNote,
  getTeacherNotes,
  deleteNote,
  getAnalytics,
} from '../controllers/teacherController';
import { authenticate, authorize } from '../middlewares/authMiddleware';

const router = Router();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads', 'notes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config for note uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.xlsx', '.zip', '.rar'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} is not allowed`));
    }
  },
});

// All teacher routes require authentication + teacher role
router.use(authenticate, authorize('teacher'));

router.get('/dashboard', getDashboard);
router.get('/students/search', searchStudents);
router.get('/students/class', getClassStudents);
router.get('/subjects/:subjectId/students', getStudentsBySubject);

// Notes endpoints
router.get('/notes', getTeacherNotes);
router.post('/notes', upload.single('file'), uploadNote);
router.delete('/notes/:id', deleteNote);

router.get('/analytics', getAnalytics);

export default router;
