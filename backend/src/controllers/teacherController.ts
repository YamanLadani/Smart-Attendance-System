import { type Response } from 'express';
import { eq, and, gte, lte, count, sql, desc, ilike, or } from 'drizzle-orm';
import { getDB } from '../config/db';
import { users, notes, attendance, subjects, timetables, students, enrollments } from '../db/schema';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Teacher dashboard data — includes subjects list, enrolled student counts, and recent records.
 */
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    // Today's attendance summary
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [{ total: todayAttendance }] = await db
      .select({ total: count() })
      .from(attendance)
      .where(and(
        eq(attendance.teacherId, req.user.userId),
        gte(attendance.date, todayStart),
        lte(attendance.date, todayEnd),
      ));

    // Look up teacher profile & department
    const [teacherUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    const teacherDept = teacherUser?.department || '';

    // Subjects taught (with enriched data)
    const subjectConditions = [eq(subjects.isActive, true)];
    if (teacherDept) {
      subjectConditions.push(
        or(
          eq(subjects.teacherId, req.user.userId),
          eq(subjects.department, teacherDept)
        )!
      );
    } else {
      subjectConditions.push(eq(subjects.teacherId, req.user.userId));
    }

    const subjectsList = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        department: subjects.department,
        semester: subjects.semester,
        credits: subjects.credits,
        type: subjects.type,
        isActive: subjects.isActive,
      })
      .from(subjects)
      .where(and(...subjectConditions));

    // Total unique students enrolled across all teacher's subjects
    const subjectIds = subjectsList.map(s => s.id);
    let totalEnrolledStudents = 0;

    // Per-subject enrolled student counts (from enrollments table, not attendance)
    const enrollmentCounts = subjectIds.length > 0
      ? await db
          .select({
            subjectId: enrollments.subjectId,
            studentCount: sql<number>`COUNT(DISTINCT ${enrollments.studentId})::int`,
          })
          .from(enrollments)
          .where(eq(enrollments.isActive, true))
          .groupBy(enrollments.subjectId)
      : [];

    const subjectCountMap = new Map(enrollmentCounts.map(s => [s.subjectId, s.studentCount]));
    totalEnrolledStudents = enrollmentCounts
      .filter(e => subjectIds.includes(e.subjectId))
      .reduce((sum, e) => sum + e.studentCount, 0);

    const enrichedSubjects = subjectsList.map(s => ({
      ...s,
      studentCount: subjectCountMap.get(s.id) || 0,
    }));

    // Recent attendance records with joins
    const recentRecords = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        markedAt: attendance.markedAt,
        studentId: attendance.studentId,
        studentName: users.displayName,
        studentEmail: users.email,
        studentRollNumber: users.rollNumber,
        subjectId: attendance.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(attendance)
      .leftJoin(users, eq(attendance.studentId, users.id))
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .where(eq(attendance.teacherId, req.user.userId))
      .orderBy(desc(attendance.date))
      .limit(20);

    // Today's timetable
    const today = new Date().getDay();
    const scheduleConditions = [
      eq(timetables.dayOfWeek, today),
      eq(timetables.isActive, true),
    ];
    if (teacherDept) {
      scheduleConditions.push(
        or(
          eq(timetables.teacherId, req.user.userId),
          eq(timetables.department, teacherDept)
        )!
      );
    } else {
      scheduleConditions.push(eq(timetables.teacherId, req.user.userId));
    }

    const todaySchedule = await db
      .select({
        id: timetables.id,
        startTime: timetables.startTime,
        endTime: timetables.endTime,
        room: timetables.room,
        type: timetables.type,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        department: timetables.department,
        semester: timetables.semester,
        division: timetables.division,
      })
      .from(timetables)
      .leftJoin(subjects, eq(timetables.subjectId, subjects.id))
      .where(and(...scheduleConditions))
      .orderBy(timetables.startTime);

    sendSuccess(res, 200, 'Teacher dashboard data retrieved', {
      todayAttendanceCount: todayAttendance,
      subjectCount: enrichedSubjects.length,
      subjects: enrichedSubjects,
      totalStudents: totalEnrolledStudents,
      recentRecords,
      todaySchedule,
    });
  } catch (error) {
    logger.error('Teacher dashboard failed:', error);
    sendError(res, 500, 'Failed to load dashboard.');
  }
};

/**
 * Get students who attended a specific subject with attendance stats.
 */
export const getStudentsBySubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const subjectId = req.params.subjectId as string;
    const db = getDB();

    // Get subject info
    const [subject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);

    if (!subject) {
      sendError(res, 404, 'Subject not found.');
      return;
    }

    // 1. Get all students in this subject's department & semester
    const classStudents = await db
      .select({
        studentId: users.id,
        studentName: users.displayName,
        studentEmail: users.email,
        studentRollNumber: users.rollNumber,
        studentDepartment: users.department,
        studentSemester: users.semester,
        studentDivision: users.division,
      })
      .from(users)
      .where(and(
        eq(users.role, 'student'),
        eq(users.department, subject.department),
        eq(users.semester, subject.semester),
        eq(users.isActive, true)
      ))
      .orderBy(users.rollNumber, users.displayName);

    // 2. Get attendance stats for this subject
    const attendanceStats = await db
      .select({
        studentId: attendance.studentId,
        totalClasses: count(),
        presentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
        absentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'absent' THEN 1 ELSE 0 END)::int`,
        lateCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'late' THEN 1 ELSE 0 END)::int`,
        lastAttended: sql<string>`MAX(${attendance.date})`,
      })
      .from(attendance)
      .where(eq(attendance.subjectId, subjectId))
      .groupBy(attendance.studentId);

    const statsMap = new Map(attendanceStats.map(s => [s.studentId, s]));

    // Total unique classes conducted for this subject
    const [totalConducted] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${attendance.date})::int`
      })
      .from(attendance)
      .where(eq(attendance.subjectId, subjectId));

    const totalSubjectClasses = totalConducted?.count || 0;

    const enrichedStudents = classStudents.map(student => {
      const stats = statsMap.get(student.studentId);
      const total = totalSubjectClasses > 0 ? totalSubjectClasses : (stats?.totalClasses || 0);
      const present = stats?.presentCount || 0;
      const absent = stats?.absentCount || 0;
      const late = stats?.lateCount || 0;
      const percentage = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

      return {
        ...student,
        totalClasses: total,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        lastAttended: stats?.lastAttended || null,
        attendancePercentage: percentage,
      };
    });

    sendSuccess(res, 200, 'Students retrieved', {
      subject,
      students: enrichedStudents,
      totalStudents: enrichedStudents.length,
    });
  } catch (error) {
    logger.error('Get students by subject failed:', error);
    sendError(res, 500, 'Failed to retrieve students.');
  }
};

/**
 * Get all students in a department/semester/division.
 */
export const getClassStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const { department, semester, division } = req.query;

    const db = getDB();
    const [teacherUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    const conditions = [
      eq(users.role, 'student'),
      eq(users.isActive, true),
    ];

    const targetDept = department || teacherUser?.department;
    if (targetDept) conditions.push(eq(users.department, targetDept as string));
    if (semester) conditions.push(eq(users.semester, parseInt(semester as string, 10)));
    if (division) conditions.push(eq(users.division, division as string));

    const studentsList = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        department: users.department,
        semester: users.semester,
        division: users.division,
        rollNumber: users.rollNumber,
        phone: users.phone,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(users.rollNumber, users.displayName)
      .limit(500);

    sendSuccess(res, 200, 'Class students retrieved', { students: studentsList });
  } catch (error) {
    logger.error('Get class students failed:', error);
    sendError(res, 500, 'Failed to retrieve students.');
  }
};

/**
 * Search students.
 */
export const searchStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const { q, department, semester } = req.query;

    const db = getDB();
    const [teacherUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    const conditions = [
      eq(users.role, 'student'),
      eq(users.isActive, true),
    ];

    if (q) {
      const searchTerm = `%${q as string}%`;
      conditions.push(
        or(
          ilike(users.displayName, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.rollNumber, searchTerm),
        )!
      );
    }
    const targetDept = department || teacherUser?.department;
    if (targetDept) conditions.push(eq(users.department, targetDept as string));
    if (semester) conditions.push(eq(users.semester, parseInt(semester as string, 10)));

    const studentsList = await db
      .select({
        id: users.id,
        displayName: users.displayName,
        email: users.email,
        department: users.department,
        semester: users.semester,
        division: users.division,
        rollNumber: users.rollNumber,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(users.rollNumber, users.displayName)
      .limit(500);

    sendSuccess(res, 200, 'Students found', { students: studentsList });
  } catch (error) {
    logger.error('Search students failed:', error);
    sendError(res, 500, 'Failed to search students.');
  }
};

/**
 * Upload notes.
 */
export const uploadNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    if (!req.file) {
      sendError(res, 400, 'No file uploaded.');
      return;
    }

    const db = getDB();
    const { subjectId, title, description, department, semester, division } = req.body;
    const fileUrl = `/uploads/notes/${req.file.filename}`;

    const [note] = await db
      .insert(notes)
      .values({
        teacherId: req.user.userId,
        subjectId,
        title,
        description: description || null,
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        department: department || 'General',
        semester: semester ? parseInt(semester, 10) : 1,
        division: division || null,
      })
      .returning();

    sendSuccess(res, 201, 'Note uploaded successfully', { note });
  } catch (error) {
    logger.error('Upload note failed:', error);
    sendError(res, 500, 'Failed to upload note.');
  }
};

/**
 * Get all notes uploaded by the current teacher.
 */
export const getTeacherNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const teacherNotes = await db
      .select({
        id: notes.id,
        title: notes.title,
        description: notes.description,
        fileUrl: notes.fileUrl,
        fileName: notes.fileName,
        fileSize: notes.fileSize,
        fileType: notes.fileType,
        department: notes.department,
        semester: notes.semester,
        division: notes.division,
        createdAt: notes.createdAt,
        subjectId: notes.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(notes)
      .leftJoin(subjects, eq(notes.subjectId, subjects.id))
      .where(eq(notes.teacherId, req.user.userId))
      .orderBy(desc(notes.createdAt));

    sendSuccess(res, 200, 'Notes retrieved successfully', { notes: teacherNotes });
  } catch (error) {
    logger.error('Get teacher notes failed:', error);
    sendError(res, 500, 'Failed to retrieve notes.');
  }
};

/**
 * Delete a note uploaded by the current teacher.
 */
export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const noteId = String(req.params.id);
    if (!noteId) {
      sendError(res, 400, 'Note ID is required.');
      return;
    }

    const db = getDB();
    const [existing] = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, noteId), eq(notes.teacherId, req.user.userId)))
      .limit(1);

    if (!existing) {
      sendError(res, 404, 'Note not found or you are not authorized to delete it.');
      return;
    }

    await db.delete(notes).where(eq(notes.id, noteId));

    sendSuccess(res, 200, 'Note deleted successfully');
  } catch (error) {
    logger.error('Delete note failed:', error);
    sendError(res, 500, 'Failed to delete note.');
  }
};

/**
 * Get attendance analytics for a teacher's classes.
 */
export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    // Subject-wise attendance breakdown
    const subjectStats = await db
      .select({
        subjectId: attendance.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        totalRecords: count(),
        presentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
        absentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'absent' THEN 1 ELSE 0 END)::int`,
      })
      .from(attendance)
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .where(eq(attendance.teacherId, req.user.userId))
      .groupBy(attendance.subjectId, subjects.name, subjects.code);

    const enrichedSubjectStats = subjectStats.map((s) => ({
      ...s,
      attendanceRate: s.totalRecords > 0
        ? Math.round((s.presentCount / s.totalRecords) * 1000) / 10
        : 0,
    }));

    // Daily trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrend = await db
      .select({
        date: sql<string>`TO_CHAR(${attendance.date}, 'YYYY-MM-DD')`,
        total: count(),
        present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
      })
      .from(attendance)
      .where(and(
        eq(attendance.teacherId, req.user.userId),
        gte(attendance.date, thirtyDaysAgo),
      ))
      .groupBy(sql`TO_CHAR(${attendance.date}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${attendance.date}, 'YYYY-MM-DD')`);

    sendSuccess(res, 200, 'Analytics retrieved', { subjectStats: enrichedSubjectStats, dailyTrend });
  } catch (error) {
    logger.error('Get analytics failed:', error);
    sendError(res, 500, 'Failed to retrieve analytics.');
  }
};
