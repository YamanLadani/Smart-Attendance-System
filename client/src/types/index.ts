// ─── User Types ──────────────────────────────────────────────────────
export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  department?: string;
  semester?: number;
  division?: string;
  rollNumber?: string;
  phone?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  enrollmentNumber: string;
  branch: string;
  semester: number;
  division: string;
  rollNumber: string;
  batch: string;
  strongSubjects: string[];
  weakSubjects: string[];
  careerGoal?: string;
  cgpa?: number;
  parentPhone?: string;
  address?: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  employeeId: string;
  department: string;
  designation: string;
  specialization?: string;
  subjects: string[];
  qualification?: string;
  experience?: number;
}

export interface AdminProfile {
  id: string;
  userId: string;
  adminLevel: 'super' | 'department' | 'general';
  managedDepartments: string[];
  permissions: string[];
}

// ─── Auth Types ──────────────────────────────────────────────────────
export interface AuthResponse {
  user: User;
  profile?: StudentProfile | TeacherProfile | AdminProfile;
  token: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  department?: string;
  semester?: number;
  division?: string;
  rollNumber?: string;
  phone?: string;
  enrollmentNumber?: string;
  branch?: string;
  batch?: string;
  employeeId?: string;
  designation?: string;
}

// ─── Attendance Types ────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  studentId: string;
  teacherId: string;
  subjectId: string;
  sessionId?: string;
  timetableId?: string;
  lectureId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  markedAt: string;
  qrScannedAt?: string;
  isManual?: boolean;
  subjectName?: string;
  subjectCode?: string;
  teacherName?: string;
  studentName?: string;
  studentRollNumber?: string;
  remarks?: string;
}

export interface AttendanceStats {
  subjectWise: SubjectAttendance[];
  overall: {
    totalClasses: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    percentage: number;
  };
}

export interface SubjectAttendance {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  percentage: number;
}

export interface AttendanceSession {
  id: string;
  subjectId: string;
  teacherId: string;
  timetableId?: string;
  lectureId: string;
  qrToken: string;
  expirySeconds: number;
  isActive: boolean;
  startedAt: string;
  endedAt?: string;
}

// ─── Subject Types ───────────────────────────────────────────────────
export interface Subject {
  id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  year?: number;
  academicYear?: string;
  credits: number;
  teachingHours?: number;
  type: 'core' | 'elective' | 'university_elective' | 'audit_course' | 'project' | 'internship' | 'skill_augmentation' | 'theory' | 'practical' | 'tutorial';
  teacherId?: string;
  teacherName?: string;
  isActive: boolean;
  enrolledStudents?: number;
}

// ─── Enrollment Types ────────────────────────────────────────────────
export interface Enrollment {
  enrollmentId: string;
  studentId: string;
  subjectId: string;
  studentName?: string;
  studentEmail?: string;
  studentRollNumber?: string;
  studentDepartment?: string;
  studentSemester?: number;
  subjectName?: string;
  subjectCode?: string;
  subjectType?: string;
  credits?: number;
  teacherName?: string;
  enrolledAt: string;
  isActive?: boolean;
  // Attendance stats when viewing enrolled students for a subject
  totalClasses?: number;
  presentCount?: number;
  absentCount?: number;
  lateCount?: number;
  attendancePercentage?: number;
}

// ─── Timetable Types ────────────────────────────────────────────────
export interface TimetableEntry {
  id: string;
  department: string;
  semester: number;
  division: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  type: 'lecture' | 'practical' | 'tutorial';
  isActive: boolean;
  subjectName?: string;
  subjectCode?: string;
  subjectType?: string;
  teacherName?: string;
  status?: 'past' | 'current' | 'upcoming';
}

export interface FreePeriod {
  startTime: string;
  endTime: string;
  duration: number;
}

// ─── Notification Types ─────────────────────────────────────────────
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'attendance' | 'lecture_cancelled' | 'ai_reminder' | 'assignment' | 'low_attendance' | 'system';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// ─── Goal Types ─────────────────────────────────────────────────────
export interface Goal {
  id: string;
  studentId: string;
  type: 'daily' | 'weekly' | 'career';
  title: string;
  description?: string;
  tasks: GoalTask[];
  dueDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface GoalTask {
  text: string;
  isCompleted: boolean;
  completedAt?: string;
}

// ─── Note Types ─────────────────────────────────────────────────────
export interface Note {
  id: string;
  teacherId: string;
  subjectId: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  department: string;
  semester: number;
  downloads: number;
  createdAt: string;
}

// ─── Gemini Types ───────────────────────────────────────────────────
export interface GeminiHistoryItem {
  id: string;
  studentId: string;
  prompt: string;
  response: string;
  type: 'study_plan' | 'revision' | 'practice' | 'career' | 'quiz' | 'motivation' | 'time_management';
  isBookmarked: boolean;
  createdAt: string;
}

export interface StudyPlan {
  dailyPlan: { time: string; task: string; subject: string }[];
  revisionTopics: string[];
  practiceQuestions: { question: string; subject: string; difficulty: string }[];
  careerAdvice: string;
  miniQuiz: QuizQuestion[];
  motivationalQuote: string;
  timeManagementTips: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

// ─── Audit Log Types ────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── API Response Types ─────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  errors?: { field: string; message: string }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── QR Types ───────────────────────────────────────────────────────
export interface QRPayload {
  lectureId: string;
  subjectId: string;
  teacherId: string;
  timetableId?: string;
  timestamp: number;
  expiresAt: number;
  token: string;
}

export interface QRGenerateResponse {
  qrDataUrl: string;
  lectureId: string;
  expiresAt: number;
  token: string;
}

// ─── Dashboard Types ────────────────────────────────────────────────
export interface StudentDashboardData {
  user: User;
  student: StudentProfile;
  attendance: {
    total: number;
    present: number;
    percentage: number;
  };
  recentAttendance: AttendanceRecord[];
  activeGoals: Goal[];
}

export interface TeacherDashboardData {
  todayAttendanceCount: number;
  subjectCount: number;
  subjects: (Subject & { studentCount: number })[];
  totalStudents: number;
  recentRecords: AttendanceRecord[];
  todaySchedule?: TimetableEntry[];
}

export interface AdminDashboardData {
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalAttendanceToday: number;
  departments: { department: string; count: number }[];
}
