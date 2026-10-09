import { type Response } from 'express';
import { eq, and, or, desc } from 'drizzle-orm';
import { getDB } from '../config/db';
import { timetables, subjects, users } from '../db/schema';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Create a timetable entry.
 */
export const createTimetable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    const [entry] = await db
      .insert(timetables)
      .values({
        ...req.body,
        teacherId: req.user.userId,
      })
      .returning();

    sendSuccess(res, 201, 'Timetable entry created', { entry });
  } catch (error) {
    logger.error('Create timetable failed:', error);
    sendError(res, 500, 'Failed to create timetable entry.');
  }
};

/**
 * Get timetable for a specific department/semester/division.
 */
export const getTimetable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, semester, division, dayOfWeek, teacherId } = req.query;

    const db = getDB();
    const conditions = [eq(timetables.isActive, true)];

    if (department) conditions.push(eq(timetables.department, department as string));
    if (semester) conditions.push(eq(timetables.semester, parseInt(semester as string, 10)));
    if (division) conditions.push(eq(timetables.division, division as string));
    if (dayOfWeek !== undefined) conditions.push(eq(timetables.dayOfWeek, parseInt(dayOfWeek as string, 10)));
    if (teacherId) {
      conditions.push(eq(timetables.teacherId, teacherId as string));
    } else if (req.user?.role === 'teacher' && !department && !semester) {
      const [teacherUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (teacherUser?.department) {
        conditions.push(
          or(
            eq(timetables.teacherId, req.user.userId),
            eq(timetables.department, teacherUser.department)
          )!
        );
      } else {
        conditions.push(eq(timetables.teacherId, req.user.userId));
      }
    }

    const entries = await db
      .select({
        id: timetables.id,
        department: timetables.department,
        semester: timetables.semester,
        division: timetables.division,
        dayOfWeek: timetables.dayOfWeek,
        startTime: timetables.startTime,
        endTime: timetables.endTime,
        room: timetables.room,
        type: timetables.type,
        isActive: timetables.isActive,
        createdAt: timetables.createdAt,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectType: subjects.type,
        teacherName: users.displayName,
      })
      .from(timetables)
      .leftJoin(subjects, eq(timetables.subjectId, subjects.id))
      .leftJoin(users, eq(timetables.teacherId, users.id))
      .where(and(...conditions))
      .orderBy(timetables.dayOfWeek, timetables.startTime);

    sendSuccess(res, 200, 'Timetable retrieved', { entries });
  } catch (error) {
    logger.error('Get timetable failed:', error);
    sendError(res, 500, 'Failed to retrieve timetable.');
  }
};

/**
 * Get today's timetable for the current user.
 */
export const getTodaysTimetable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const today = new Date().getDay(); // 0=Sunday
    const conditions = [
      eq(timetables.dayOfWeek, today),
      eq(timetables.isActive, true),
    ];

    // If teacher, show their classes
    if (req.user.role === 'teacher') {
      const [teacherUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (teacherUser?.department) {
        conditions.push(
          or(
            eq(timetables.teacherId, req.user.userId),
            eq(timetables.department, teacherUser.department)
          )!
        );
      } else {
        conditions.push(eq(timetables.teacherId, req.user.userId));
      }
    } else if (req.user.role === 'student') {
      // Look up student details
      const [studentUser] = await db
        .select({
          department: users.department,
          semester: users.semester,
          division: users.division,
        })
        .from(users)
        .where(eq(users.id, req.user.userId))
        .limit(1);

      if (studentUser) {
        if (studentUser.department) {
          conditions.push(eq(timetables.department, studentUser.department));
        }
        if (studentUser.semester) {
          conditions.push(eq(timetables.semester, studentUser.semester));
        }
        if (studentUser.division) {
          conditions.push(eq(timetables.division, studentUser.division));
        }
      }
    }

    const entries = await db
      .select({
        id: timetables.id,
        department: timetables.department,
        semester: timetables.semester,
        division: timetables.division,
        dayOfWeek: timetables.dayOfWeek,
        startTime: timetables.startTime,
        endTime: timetables.endTime,
        room: timetables.room,
        type: timetables.type,
        isActive: timetables.isActive,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectType: subjects.type,
        teacherName: users.displayName,
      })
      .from(timetables)
      .leftJoin(subjects, eq(timetables.subjectId, subjects.id))
      .leftJoin(users, eq(timetables.teacherId, users.id))
      .where(and(...conditions))
      .orderBy(timetables.startTime);

    // Detect current, upcoming, and free periods
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const enriched = entries.map((entry) => {
      let status: 'past' | 'current' | 'upcoming' = 'past';
      if (currentTimeStr >= entry.startTime && currentTimeStr < entry.endTime) {
        status = 'current';
      } else if (currentTimeStr < entry.startTime) {
        status = 'upcoming';
      }
      return { ...entry, status };
    });

    // Detect free periods (gaps between classes)
    const freePeriods: { startTime: string; endTime: string; duration: number }[] = [];
    for (let i = 0; i < enriched.length - 1; i++) {
      const current = enriched[i]!;
      const next = enriched[i + 1]!;
      if (current.endTime < next.startTime) {
        const [endH, endM] = current.endTime.split(':').map(Number);
        const [startH, startM] = next.startTime.split(':').map(Number);
        const duration = ((startH! - endH!) * 60) + (startM! - endM!);
        if (duration > 0) {
          freePeriods.push({
            startTime: current.endTime,
            endTime: next.startTime,
            duration,
          });
        }
      }
    }

    sendSuccess(res, 200, "Today's timetable retrieved", {
      entries: enriched,
      freePeriods,
    });
  } catch (error) {
    logger.error('Get today timetable failed:', error);
    sendError(res, 500, "Failed to retrieve today's timetable.");
  }
};

/**
 * Update a timetable entry.
 */
export const updateTimetable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = getDB();

    const [entry] = await db
      .update(timetables)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(timetables.id, req.params.id as string))
      .returning();

    if (!entry) {
      sendError(res, 404, 'Timetable entry not found.');
      return;
    }

    sendSuccess(res, 200, 'Timetable entry updated', { entry });
  } catch (error) {
    logger.error('Update timetable failed:', error);
    sendError(res, 500, 'Failed to update timetable entry.');
  }
};

/**
 * Delete a timetable entry (soft delete).
 */
export const deleteTimetable = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = getDB();

    const [entry] = await db
      .update(timetables)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(timetables.id, req.params.id as string))
      .returning();

    if (!entry) {
      sendError(res, 404, 'Timetable entry not found.');
      return;
    }

    sendSuccess(res, 200, 'Timetable entry deleted');
  } catch (error) {
    logger.error('Delete timetable failed:', error);
    sendError(res, 500, 'Failed to delete timetable entry.');
  }
};

/**
 * Create a subject (admin/teacher).
 */
export const createSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = getDB();

    const [subject] = await db
      .insert(subjects)
      .values({
        ...req.body,
        code: req.body.code?.toUpperCase(),
      })
      .returning();

    sendSuccess(res, 201, 'Subject created', { subject });
  } catch (error) {
    logger.error('Create subject failed:', error);
    sendError(res, 500, 'Failed to create subject.');
  }
};

/**
 * Get all subjects with optional filters.
 */
export const getSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, semester } = req.query;

    const db = getDB();
    const conditions = [eq(subjects.isActive, true)];

    if (department) conditions.push(eq(subjects.department, department as string));
    if (semester) conditions.push(eq(subjects.semester, parseInt(semester as string, 10)));

    const subjectsList = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        department: subjects.department,
        semester: subjects.semester,
        credits: subjects.credits,
        type: subjects.type,
        teacherId: subjects.teacherId,
        isActive: subjects.isActive,
        createdAt: subjects.createdAt,
        teacherName: users.displayName,
      })
      .from(subjects)
      .leftJoin(users, eq(subjects.teacherId, users.id))
      .where(and(...conditions))
      .orderBy(subjects.name);

    sendSuccess(res, 200, 'Subjects retrieved', { subjects: subjectsList });
  } catch (error) {
    logger.error('Get subjects failed:', error);
    sendError(res, 500, 'Failed to retrieve subjects.');
  }
};
