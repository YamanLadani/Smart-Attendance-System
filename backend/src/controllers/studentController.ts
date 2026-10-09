import { type Response } from 'express';
import { eq, and, count, sql, desc } from 'drizzle-orm';
import { getDB } from '../config/db';
import { users, students, attendance, goals, geminiHistory, subjects, notes, enrollments } from '../db/schema';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Get student dashboard data.
 */
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    const [student] = await db
      .select()
      .from(students)
      .where(eq(students.userId, req.user.userId))
      .limit(1);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    // Get attendance stats
    const [{ total: totalAttendance }] = await db
      .select({ total: count() })
      .from(attendance)
      .where(eq(attendance.studentId, req.user.userId));

    const [{ total: presentCount }] = await db
      .select({ total: count() })
      .from(attendance)
      .where(and(
        eq(attendance.studentId, req.user.userId),
        eq(attendance.status, 'present'),
      ));

    const attendancePercent = totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 1000) / 10
      : 0;

    // Recent attendance with subject info
    const recentAttendance = await db
      .select({
        id: attendance.id,
        date: attendance.date,
        status: attendance.status,
        markedAt: attendance.markedAt,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(attendance)
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .where(eq(attendance.studentId, req.user.userId))
      .orderBy(desc(attendance.date))
      .limit(5);

    // Active goals
    const activeGoals = await db
      .select()
      .from(goals)
      .where(and(
        eq(goals.studentId, req.user.userId),
        eq(goals.isCompleted, false),
      ))
      .orderBy(desc(goals.createdAt))
      .limit(5);

    sendSuccess(res, 200, 'Dashboard data retrieved', {
      user,
      student,
      attendance: {
        total: totalAttendance,
        present: presentCount,
        percentage: attendancePercent,
      },
      recentAttendance,
      activeGoals,
    });
  } catch (error) {
    logger.error('Student dashboard failed:', error);
    sendError(res, 500, 'Failed to load dashboard.');
  }
};

/**
 * Get/update student goals.
 */
export const getGoals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const { type } = req.query;

    const conditions = [eq(goals.studentId, req.user.userId)];
    if (type) conditions.push(eq(goals.type, type as 'daily' | 'weekly' | 'career'));

    const result = await db
      .select()
      .from(goals)
      .where(and(...conditions))
      .orderBy(desc(goals.createdAt));

    sendSuccess(res, 200, 'Goals retrieved', { goals: result });
  } catch (error) {
    logger.error('Get goals failed:', error);
    sendError(res, 500, 'Failed to retrieve goals.');
  }
};

export const createGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const { type, title, description, tasks, dueDate } = req.body;

    const [goal] = await db
      .insert(goals)
      .values({
        studentId: req.user.userId,
        type,
        title,
        description,
        tasks: tasks || [],
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    sendSuccess(res, 201, 'Goal created', { goal });
  } catch (error) {
    logger.error('Create goal failed:', error);
    sendError(res, 500, 'Failed to create goal.');
  }
};

export const updateGoal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = getDB();
    const { title, description, tasks, isCompleted, dueDate } = req.body;

    const [goal] = await db
      .update(goals)
      .set({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(tasks !== undefined && { tasks }),
        ...(isCompleted !== undefined && { isCompleted }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(isCompleted && { completedAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(goals.id, req.params.id as string))
      .returning();

    if (!goal) {
      sendError(res, 404, 'Goal not found.');
      return;
    }

    sendSuccess(res, 200, 'Goal updated', { goal });
  } catch (error) {
    logger.error('Update goal failed:', error);
    sendError(res, 500, 'Failed to update goal.');
  }
};

/**
 * Get bookmarked Gemini history items.
 */
export const getBookmarks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    const bookmarks = await db
      .select()
      .from(geminiHistory)
      .where(and(
        eq(geminiHistory.studentId, req.user.userId),
        eq(geminiHistory.isBookmarked, true),
      ))
      .orderBy(desc(geminiHistory.createdAt));

    sendSuccess(res, 200, 'Bookmarks retrieved', { bookmarks });
  } catch (error) {
    logger.error('Get bookmarks failed:', error);
    sendError(res, 500, 'Failed to retrieve bookmarks.');
  }
};

/**
 * Toggle bookmark on a Gemini history item.
 */
export const toggleBookmark = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = getDB();

    const [item] = await db
      .select()
      .from(geminiHistory)
      .where(eq(geminiHistory.id, req.params.id as string))
      .limit(1);

    if (!item) {
      sendError(res, 404, 'Item not found.');
      return;
    }

    const [updated] = await db
      .update(geminiHistory)
      .set({ isBookmarked: !item.isBookmarked, updatedAt: new Date() })
      .where(eq(geminiHistory.id, req.params.id as string))
      .returning();

    sendSuccess(res, 200, `Bookmark ${updated?.isBookmarked ? 'added' : 'removed'}`, { item: updated });
  } catch (error) {
    logger.error('Toggle bookmark failed:', error);
    sendError(res, 500, 'Failed to toggle bookmark.');
  }
};

/**
 * Get study notes available to the current student.
 * Filters by student's department, semester, or enrolled subjects.
 */
export const getStudentNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    // 1. Fetch student's profile details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user) {
      sendError(res, 404, 'Student record not found.');
      return;
    }

    // 2. Fetch student's enrolled subject IDs
    const studentEnrollments = await db
      .select({ subjectId: enrollments.subjectId })
      .from(enrollments)
      .where(and(eq(enrollments.studentId, req.user.userId), eq(enrollments.isActive, true)));

    const enrolledIds = studentEnrollments.map((e) => e.subjectId);

    // 3. Query notes
    const allNotes = await db
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
        teacherId: notes.teacherId,
        teacherName: users.displayName,
        teacherEmail: users.email,
      })
      .from(notes)
      .leftJoin(subjects, eq(notes.subjectId, subjects.id))
      .leftJoin(users, eq(notes.teacherId, users.id))
      .orderBy(desc(notes.createdAt));

    // Filter notes relevant to this student:
    // - Note matches student's semester AND (department matches OR enrolled in that subject)
    const studentNotes = allNotes.filter((n) => {
      // If note specifies semester, it must match student's semester
      if (n.semester && user.semester && n.semester !== user.semester) {
        return false;
      }
      // If student is enrolled in the subject, they definitely get the note
      if (n.subjectId && enrolledIds.includes(n.subjectId)) {
        return true;
      }
      // If note matches student's department & semester
      if (n.department && user.department && n.department.toLowerCase() === user.department.toLowerCase()) {
        return true;
      }
      // If no department/subject restriction, show to students of matching semester
      if (!n.department && (!n.semester || n.semester === user.semester)) {
        return true;
      }
      return false;
    });

    sendSuccess(res, 200, 'Student notes retrieved successfully', { notes: studentNotes });
  } catch (error) {
    logger.error('Get student notes failed:', error);
    sendError(res, 500, 'Failed to retrieve notes.');
  }
};
