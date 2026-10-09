import { relations } from 'drizzle-orm';
import {
  users, students, teachers, admins, subjects, enrollments,
  attendance, attendanceSessions, timetables, notifications, notes,
  goals, geminiHistory, settings, auditLogs,
} from './schema';

// ─── User Relations ──────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  student: one(students, { fields: [users.id], references: [students.userId] }),
  teacher: one(teachers, { fields: [users.id], references: [teachers.userId] }),
  admin: one(admins, { fields: [users.id], references: [admins.userId] }),
  enrollments: many(enrollments),
  attendanceAsStudent: many(attendance, { relationName: 'studentAttendance' }),
  attendanceAsTeacher: many(attendance, { relationName: 'teacherAttendance' }),
  sessions: many(attendanceSessions),
  timetables: many(timetables),
  notifications: many(notifications),
  notes: many(notes),
  goals: many(goals),
  geminiHistory: many(geminiHistory),
  auditLogs: many(auditLogs),
}));

// ─── Student Relations ───────────────────────────────────────────────

export const studentsRelations = relations(students, ({ one }) => ({
  user: one(users, { fields: [students.userId], references: [users.id] }),
}));

// ─── Teacher Relations ───────────────────────────────────────────────

export const teachersRelations = relations(teachers, ({ one }) => ({
  user: one(users, { fields: [teachers.userId], references: [users.id] }),
}));

// ─── Admin Relations ─────────────────────────────────────────────────

export const adminsRelations = relations(admins, ({ one }) => ({
  user: one(users, { fields: [admins.userId], references: [users.id] }),
}));

// ─── Subject Relations ───────────────────────────────────────────────

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  teacher: one(users, { fields: [subjects.teacherId], references: [users.id] }),
  enrollments: many(enrollments),
  attendance: many(attendance),
  sessions: many(attendanceSessions),
  timetables: many(timetables),
  notes: many(notes),
}));

// ─── Enrollment Relations ────────────────────────────────────────────

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, { fields: [enrollments.studentId], references: [users.id] }),
  subject: one(subjects, { fields: [enrollments.subjectId], references: [subjects.id] }),
  enrolledByUser: one(users, { fields: [enrollments.enrolledBy], references: [users.id] }),
}));

// ─── Attendance Session Relations ────────────────────────────────────

export const attendanceSessionsRelations = relations(attendanceSessions, ({ one, many }) => ({
  subject: one(subjects, { fields: [attendanceSessions.subjectId], references: [subjects.id] }),
  teacher: one(users, { fields: [attendanceSessions.teacherId], references: [users.id] }),
  timetable: one(timetables, { fields: [attendanceSessions.timetableId], references: [timetables.id] }),
  attendanceRecords: many(attendance),
}));

// ─── Attendance Relations ────────────────────────────────────────────

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
    relationName: 'studentAttendance',
  }),
  teacher: one(users, {
    fields: [attendance.teacherId],
    references: [users.id],
    relationName: 'teacherAttendance',
  }),
  subject: one(subjects, { fields: [attendance.subjectId], references: [subjects.id] }),
  session: one(attendanceSessions, { fields: [attendance.sessionId], references: [attendanceSessions.id] }),
  timetable: one(timetables, { fields: [attendance.timetableId], references: [timetables.id] }),
}));

// ─── Timetable Relations ────────────────────────────────────────────

export const timetablesRelations = relations(timetables, ({ one }) => ({
  subject: one(subjects, { fields: [timetables.subjectId], references: [subjects.id] }),
  teacher: one(users, { fields: [timetables.teacherId], references: [users.id] }),
}));

// ─── Notification Relations ──────────────────────────────────────────

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// ─── Note Relations ──────────────────────────────────────────────────

export const notesRelations = relations(notes, ({ one }) => ({
  teacher: one(users, { fields: [notes.teacherId], references: [users.id] }),
  subject: one(subjects, { fields: [notes.subjectId], references: [subjects.id] }),
}));

// ─── Goal Relations ──────────────────────────────────────────────────

export const goalsRelations = relations(goals, ({ one }) => ({
  student: one(users, { fields: [goals.studentId], references: [users.id] }),
}));

// ─── Gemini History Relations ────────────────────────────────────────

export const geminiHistoryRelations = relations(geminiHistory, ({ one }) => ({
  student: one(users, { fields: [geminiHistory.studentId], references: [users.id] }),
}));

// ─── Audit Log Relations ────────────────────────────────────────────

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// ─── Settings Relations ──────────────────────────────────────────────

export const settingsRelations = relations(settings, ({ one }) => ({
  updater: one(users, { fields: [settings.updatedBy], references: [users.id] }),
}));
