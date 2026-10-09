import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  real,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';

// ─── Enums ───────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['student', 'teacher', 'admin']);
export const adminLevelEnum = pgEnum('admin_level', ['super', 'department', 'general']);
export const subjectTypeEnum = pgEnum('subject_type', [
  'core', 'elective', 'university_elective', 'audit_course',
  'project', 'internship', 'skill_augmentation',
  'theory', 'practical', 'tutorial',
]);
export const attendanceStatusEnum = pgEnum('attendance_status', ['present', 'absent', 'late']);
export const timetableTypeEnum = pgEnum('timetable_type', ['lecture', 'practical', 'tutorial']);
export const notificationTypeEnum = pgEnum('notification_type', [
  'attendance', 'lecture_cancelled', 'ai_reminder', 'assignment', 'low_attendance', 'system',
]);
export const goalTypeEnum = pgEnum('goal_type', ['daily', 'weekly', 'career']);
export const geminiTypeEnum = pgEnum('gemini_type', [
  'study_plan', 'revision', 'practice', 'career', 'quiz', 'motivation', 'time_management',
]);
export const settingsCategoryEnum = pgEnum('settings_category', [
  'general', 'attendance', 'timetable', 'notification', 'ai',
]);
export const auditActionEnum = pgEnum('audit_action', [
  'user_created', 'user_updated', 'user_deactivated', 'user_activated',
  'admin_created', 'role_changed',
  'attendance_marked', 'attendance_corrected', 'attendance_deleted',
  'subject_created', 'subject_updated',
  'enrollment_created', 'enrollment_removed',
  'session_created', 'session_ended',
  'login', 'logout',
  'setting_updated',
]);

// ─── Users ───────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firebaseUid: varchar('firebase_uid', { length: 255 }).unique(),  // nullable for non-Firebase auth
  email: varchar('email', { length: 255 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  photoURL: text('photo_url'),
  passwordHash: varchar('password_hash', { length: 255 }),          // bcrypt hash for direct auth
  googleId: varchar('google_id', { length: 255 }).unique(),         // Google OAuth linking
  role: userRoleEnum('role').notNull().default('student'),
  department: varchar('department', { length: 255 }),
  semester: integer('semester'),
  division: varchar('division', { length: 50 }),
  rollNumber: varchar('roll_number', { length: 50 }),
  phone: varchar('phone', { length: 20 }),
  bio: text('bio'),
  isActive: boolean('is_active').notNull().default(true),
  isEmailVerified: boolean('is_email_verified').notNull().default(false),
  // OTP fields
  otpCode: varchar('otp_code', { length: 10 }),
  otpExpiresAt: timestamp('otp_expires_at', { withTimezone: true }),
  otpAttempts: integer('otp_attempts').notNull().default(0),
  otpLastSentAt: timestamp('otp_last_sent_at', { withTimezone: true }),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('users_role_idx').on(table.role),
  index('users_dept_sem_idx').on(table.department, table.semester),
]);

// ─── Students ────────────────────────────────────────────────────────

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  enrollmentNumber: varchar('enrollment_number', { length: 100 }).notNull().unique(),
  branch: varchar('branch', { length: 255 }).notNull(),
  semester: integer('semester').notNull(),
  division: varchar('division', { length: 50 }).notNull(),
  rollNumber: varchar('roll_number', { length: 50 }).notNull(),
  batch: varchar('batch', { length: 50 }),
  strongSubjects: text('strong_subjects').array().default([]),
  weakSubjects: text('weak_subjects').array().default([]),
  careerGoal: text('career_goal'),
  cgpa: real('cgpa'),
  parentPhone: varchar('parent_phone', { length: 20 }),
  address: text('address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('students_branch_sem_div_idx').on(table.branch, table.semester, table.division),
]);

// ─── Teachers ────────────────────────────────────────────────────────

export const teachers = pgTable('teachers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  employeeId: varchar('employee_id', { length: 100 }).notNull().unique(),
  department: varchar('department', { length: 255 }).notNull(),
  designation: varchar('designation', { length: 255 }).notNull(),
  specialization: varchar('specialization', { length: 255 }),
  subjects: text('subjects').array().default([]),
  qualification: varchar('qualification', { length: 255 }),
  experience: integer('experience'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('teachers_dept_idx').on(table.department),
]);

// ─── Admins ──────────────────────────────────────────────────────────

export const admins = pgTable('admins', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  adminLevel: adminLevelEnum('admin_level').notNull().default('general'),
  managedDepartments: text('managed_departments').array().default([]),
  permissions: text('permissions').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Subjects ────────────────────────────────────────────────────────

export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  department: varchar('department', { length: 255 }).notNull(),
  semester: integer('semester').notNull(),
  year: integer('year'),
  academicYear: varchar('academic_year', { length: 20 }),
  credits: integer('credits').notNull().default(0),
  teachingHours: integer('teaching_hours'),
  type: subjectTypeEnum('type').notNull().default('core'),
  teacherId: uuid('teacher_id').references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('subjects_dept_sem_idx').on(table.department, table.semester),
]);

// ─── Enrollments (Student-Subject) ──────────────────────────────────

export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  enrolledBy: uuid('enrolled_by').references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('enrollments_student_subject_idx').on(table.studentId, table.subjectId),
  index('enrollments_subject_idx').on(table.subjectId),
  index('enrollments_student_idx').on(table.studentId),
]);

// ─── Attendance Sessions ────────────────────────────────────────────

export const attendanceSessions = pgTable('attendance_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  timetableId: uuid('timetable_id').references(() => timetables.id, { onDelete: 'set null' }),
  lectureId: varchar('lecture_id', { length: 255 }).notNull().unique(),
  qrToken: varchar('qr_token', { length: 255 }).notNull(),
  expirySeconds: integer('expiry_seconds').notNull().default(30),
  isActive: boolean('is_active').notNull().default(true),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('sessions_teacher_idx').on(table.teacherId),
  index('sessions_subject_idx').on(table.subjectId),
  index('sessions_active_idx').on(table.isActive),
]);

// ─── Attendance ──────────────────────────────────────────────────────

export const attendance = pgTable('attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => attendanceSessions.id, { onDelete: 'set null' }),
  timetableId: uuid('timetable_id').references(() => timetables.id, { onDelete: 'set null' }),
  lectureId: varchar('lecture_id', { length: 255 }).notNull(),
  date: timestamp('date', { withTimezone: true }).notNull(),
  status: attendanceStatusEnum('status').notNull().default('present'),
  markedAt: timestamp('marked_at', { withTimezone: true }).notNull().defaultNow(),
  markedBy: uuid('marked_by').references(() => users.id, { onDelete: 'set null' }),
  qrScannedAt: timestamp('qr_scanned_at', { withTimezone: true }),
  qrToken: varchar('qr_token', { length: 255 }),
  isManual: boolean('is_manual').notNull().default(false),
  locationLatitude: real('location_latitude'),
  locationLongitude: real('location_longitude'),
  remarks: text('remarks'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('attendance_student_lecture_idx').on(table.studentId, table.lectureId),
  index('attendance_student_date_idx').on(table.studentId, table.date),
  index('attendance_teacher_date_idx').on(table.teacherId, table.date),
  index('attendance_subject_date_idx').on(table.subjectId, table.date),
  index('attendance_session_idx').on(table.sessionId),
]);

// ─── Timetables ──────────────────────────────────────────────────────

export const timetables = pgTable('timetables', {
  id: uuid('id').defaultRandom().primaryKey(),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  teacherId: uuid('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  department: varchar('department', { length: 255 }).notNull(),
  semester: integer('semester').notNull(),
  division: varchar('division', { length: 50 }).notNull(),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Sunday, 6=Saturday
  startTime: varchar('start_time', { length: 10 }).notNull(), // "09:00"
  endTime: varchar('end_time', { length: 10 }).notNull(),     // "10:00"
  room: varchar('room', { length: 100 }).notNull(),
  type: timetableTypeEnum('type').notNull().default('lecture'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('timetables_dept_sem_div_day_idx').on(table.department, table.semester, table.division, table.dayOfWeek),
  index('timetables_teacher_day_idx').on(table.teacherId, table.dayOfWeek),
]);

// ─── Notifications ───────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  link: text('link'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('notifications_user_read_idx').on(table.userId, table.isRead),
  index('notifications_created_idx').on(table.createdAt),
]);

// ─── Notes ───────────────────────────────────────────────────────────

export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  teacherId: uuid('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  subjectId: uuid('subject_id').notNull().references(() => subjects.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  fileUrl: text('file_url').notNull(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: varchar('file_type', { length: 100 }).notNull(),
  department: varchar('department', { length: 255 }).notNull(),
  semester: integer('semester').notNull(),
  division: varchar('division', { length: 50 }),
  downloads: integer('downloads').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('notes_subject_dept_idx').on(table.subjectId, table.department),
]);

// ─── Goals ───────────────────────────────────────────────────────────

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: goalTypeEnum('type').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  tasks: jsonb('tasks').$type<{ text: string; isCompleted: boolean; completedAt?: string }[]>().default([]),
  dueDate: timestamp('due_date', { withTimezone: true }),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('goals_student_type_idx').on(table.studentId, table.type),
]);

// ─── Gemini History ──────────────────────────────────────────────────

export const geminiHistory = pgTable('gemini_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  studentId: uuid('student_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  type: geminiTypeEnum('type').notNull(),
  metadata: jsonb('metadata').$type<{
    branch?: string;
    semester?: number;
    subjects?: string[];
    attendancePercent?: number;
  }>(),
  isBookmarked: boolean('is_bookmarked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('gemini_student_type_idx').on(table.studentId, table.type),
  index('gemini_student_bookmark_idx').on(table.studentId, table.isBookmarked),
]);

// ─── Audit Logs ──────────────────────────────────────────────────────

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: auditActionEnum('action').notNull(),
  targetType: varchar('target_type', { length: 100 }),   // 'user', 'attendance', 'subject', etc.
  targetId: varchar('target_id', { length: 255 }),        // UUID of affected record
  description: text('description').notNull(),
  metadata: jsonb('metadata'),                            // extra context (old/new values, etc.)
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('audit_logs_user_idx').on(table.userId),
  index('audit_logs_action_idx').on(table.action),
  index('audit_logs_created_idx').on(table.createdAt),
  index('audit_logs_target_idx').on(table.targetType, table.targetId),
]);

// ─── Settings ────────────────────────────────────────────────────────

export const settings = pgTable('settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  category: settingsCategoryEnum('category').notNull().default('general'),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Type Exports ────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Teacher = typeof teachers.$inferSelect;
export type NewTeacher = typeof teachers.$inferInsert;
export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
export type AttendanceSession = typeof attendanceSessions.$inferSelect;
export type NewAttendanceSession = typeof attendanceSessions.$inferInsert;
export type Attendance = typeof attendance.$inferSelect;
export type NewAttendance = typeof attendance.$inferInsert;
export type Timetable = typeof timetables.$inferSelect;
export type NewTimetable = typeof timetables.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
export type GeminiHistory = typeof geminiHistory.$inferSelect;
export type NewGeminiHistory = typeof geminiHistory.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
