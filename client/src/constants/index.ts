import type { UserRole } from '@/types';

// ─── Roles ───────────────────────────────────────────────────────────
export const ROLES: Record<UserRole, UserRole> = {
  student: 'student',
  teacher: 'teacher',
  admin: 'admin',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Admin',
};

// ─── Route Paths ─────────────────────────────────────────────────────
export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Student
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_PROFILE: '/student/profile',
  STUDENT_ATTENDANCE: '/student/attendance',
  STUDENT_TIMETABLE: '/student/timetable',
  STUDENT_QR_SCANNER: '/student/scan',
  STUDENT_AI: '/student/ai-suggestions',
  STUDENT_GOALS: '/student/goals',
  STUDENT_BOOKMARKS: '/student/bookmarks',
  STUDENT_NOTIFICATIONS: '/student/notifications',

  // Teacher
  TEACHER_DASHBOARD: '/teacher/dashboard',
  TEACHER_QR_GENERATE: '/teacher/qr-generate',
  TEACHER_CLASSES: '/teacher/classes',
  TEACHER_ATTENDANCE: '/teacher/attendance',
  TEACHER_NOTES: '/teacher/notes',
  TEACHER_ANALYTICS: '/teacher/analytics',
  TEACHER_NOTIFICATIONS: '/teacher/notifications',

  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_STUDENTS: '/admin/students',
  ADMIN_TEACHERS: '/admin/teachers',
  ADMIN_DEPARTMENTS: '/admin/departments',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_SETTINGS: '/admin/settings',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
} as const;

// ─── Dashboard Home by Role ──────────────────────────────────────────
export const ROLE_DASHBOARD: Record<UserRole, string> = {
  student: ROUTES.STUDENT_DASHBOARD,
  teacher: ROUTES.TEACHER_DASHBOARD,
  admin: ROUTES.ADMIN_DASHBOARD,
};

// ─── Days of Week ────────────────────────────────────────────────────
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

// ─── Departments ─────────────────────────────────────────────────────
export const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Electrical Engineering',
  'Chemical Engineering',
] as const;

// ─── Semesters ───────────────────────────────────────────────────────
export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// ─── Divisions ───────────────────────────────────────────────────────
export const DIVISIONS = ['A', 'B', 'C', 'D'] as const;
