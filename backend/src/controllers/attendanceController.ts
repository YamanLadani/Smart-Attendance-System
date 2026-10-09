import { type Response } from 'express';
import { eq, and, or, gte, lte, sql, count, desc } from 'drizzle-orm';
import { getDB } from '../config/db';
import { attendance, attendanceSessions, subjects, users, enrollments } from '../db/schema';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { generateQR, verifyQR } from '../services/qrService';
import { createNotification } from '../services/notificationService';
import { logAudit } from '../services/auditService';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Teacher generates a QR code for attendance.
 * Also creates a persistent AttendanceSession record.
 */
export const generateAttendanceQR = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const { subjectId, timetableId, expirySeconds } = req.body;

    if (!subjectId) {
      sendError(res, 400, 'Subject ID is required.');
      return;
    }

    const result = await generateQR({
      subjectId,
      teacherId: req.user.userId,
      timetableId,
      expirySeconds: expirySeconds || 30,
    });

    // Persist session to database
    const db = getDB();
    await db.insert(attendanceSessions).values({
      subjectId,
      teacherId: req.user.userId,
      timetableId: timetableId || null,
      lectureId: result.payload.lectureId,
      qrToken: result.payload.token,
      expirySeconds: expirySeconds || 30,
      isActive: true,
    });

    await logAudit({
      userId: req.user.userId,
      action: 'session_created',
      targetType: 'attendance_session',
      targetId: result.payload.lectureId,
      description: `Attendance session created for subject ${subjectId}`,
    });

    sendSuccess(res, 200, 'QR code generated', {
      qrDataUrl: result.qrDataUrl,
      lectureId: result.payload.lectureId,
      expiresAt: result.payload.expiresAt,
      token: result.payload.token,
    });
  } catch (error) {
    logger.error('QR generation failed:', error);
    sendError(res, 500, 'Failed to generate QR code.');
  }
};

/**
 * Student scans QR code or pastes Lecture ID to mark attendance.
 * Supports raw QR JSON, Lecture ID (e.g. LEC-...), Token, or Session ID.
 */
export const markAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const { qrData } = req.body;

    if (!qrData || typeof qrData !== 'string' || !qrData.trim()) {
      sendError(res, 400, 'QR code or Lecture ID is required.');
      return;
    }

    const db = getDB();
    const cleanInput = qrData.trim();

    let lectureId = '';
    let subjectId = '';
    let teacherId = '';
    let timetableId: string | null = null;
    let qrToken: string | null = null;
    let sessionId: string | null = null;
    let isQRScan = false;

    // 1. Try QR JSON verification
    const verification = verifyQR(cleanInput);
    if (verification.valid && verification.payload) {
      lectureId = verification.payload.lectureId;
      subjectId = verification.payload.subjectId;
      teacherId = verification.payload.teacherId;
      timetableId = verification.payload.timetableId || null;
      qrToken = verification.payload.token;
      isQRScan = true;
    } else {
      // 2. Lookup by Lecture ID, Token, or Session ID in database
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanInput);
      const sessionConditions = [
        eq(attendanceSessions.lectureId, cleanInput),
        eq(attendanceSessions.qrToken, cleanInput),
      ];
      if (isUuid) {
        sessionConditions.push(eq(attendanceSessions.id, cleanInput));
      }

      const [session] = await db
        .select()
        .from(attendanceSessions)
        .where(or(...sessionConditions)!)
        .limit(1);

      if (session) {
        lectureId = session.lectureId;
        subjectId = session.subjectId;
        teacherId = session.teacherId;
        timetableId = session.timetableId;
        qrToken = session.qrToken;
        sessionId = session.id;
      } else {
        sendError(res, 400, 'Invalid Lecture ID or expired session. Please verify the code with your teacher.');
        return;
      }
    }

    // 3. Find subject details
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (!subject) {
      sendError(res, 404, 'Subject for this lecture session was not found.');
      return;
    }

    // 4. Validate or auto-enroll student in the subject
    const [enrolled] = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, req.user.userId),
          eq(enrollments.subjectId, subjectId),
          eq(enrollments.isActive, true)
        )
      )
      .limit(1);

    if (!enrolled) {
      try {
        await db.insert(enrollments).values({
          studentId: req.user.userId,
          subjectId,
          isActive: true,
        });
      } catch {
        // ignore if already present
      }
    }

    // 5. Check for duplicate attendance
    const [existing] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.studentId, req.user.userId), eq(attendance.lectureId, lectureId)))
      .limit(1);

    if (existing) {
      sendError(res, 409, 'Attendance already recorded for this session.');
      return;
    }

    // Find session if not already retrieved
    if (!sessionId) {
      const [sess] = await db
        .select()
        .from(attendanceSessions)
        .where(eq(attendanceSessions.lectureId, lectureId))
        .limit(1);
      sessionId = sess?.id || null;
    }

    // 6. Insert attendance record
    const [record] = await db
      .insert(attendance)
      .values({
        studentId: req.user.userId,
        teacherId,
        subjectId,
        sessionId,
        timetableId,
        lectureId,
        date: new Date(),
        status: 'present',
        markedAt: new Date(),
        markedBy: req.user.userId,
        qrScannedAt: isQRScan ? new Date() : null,
        qrToken,
        isManual: !isQRScan,
      })
      .returning();

    // 7. Send notification
    try {
      await createNotification({
        userId: req.user.userId,
        title: 'Attendance Marked ✅',
        message: `Your attendance has been marked as PRESENT for ${subject.name} (${subject.code})`,
        type: 'attendance',
      });
    } catch {
      // ignore notification error
    }

    logger.info(`Attendance marked: student=${req.user.userId}, lecture=${lectureId}`);
    sendSuccess(res, 201, `Attendance marked successfully for ${subject.name}!`, { attendance: record });
  } catch (error: any) {
    logger.error('Mark attendance failed:', error);
    sendError(res, 500, error?.message || 'Failed to mark attendance.');
  }
};

/**
 * Teacher manually marks attendance for a student.
 */
export const manualMarkAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const { studentId, subjectId, lectureId, status, remarks } = req.body;

    if (!studentId || !subjectId || !lectureId || !status) {
      sendError(res, 400, 'Student ID, Subject ID, Lecture ID, and status are required.');
      return;
    }

    const db = getDB();

    // Check for duplicate
    const [existing] = await db.select().from(attendance)
      .where(and(
        eq(attendance.studentId, studentId),
        eq(attendance.lectureId, lectureId),
      ))
      .limit(1);

    if (existing) {
      // Update existing record instead
      const [updated] = await db.update(attendance)
        .set({
          status,
          remarks: remarks || existing.remarks,
          markedBy: req.user.userId,
          isManual: true,
          updatedAt: new Date(),
        })
        .where(eq(attendance.id, existing.id))
        .returning();

      await logAudit({
        userId: req.user.userId,
        action: 'attendance_corrected',
        targetType: 'attendance',
        targetId: existing.id,
        description: `Attendance updated from ${existing.status} to ${status} for student ${studentId}`,
        metadata: { oldStatus: existing.status, newStatus: status, reason: remarks },
      });

      sendSuccess(res, 200, 'Attendance updated', { attendance: updated });
      return;
    }

    // Find session
    const [session] = await db.select().from(attendanceSessions)
      .where(eq(attendanceSessions.lectureId, lectureId))
      .limit(1);

    // Create new record
    const [record] = await db.insert(attendance).values({
      studentId,
      teacherId: req.user.userId,
      subjectId,
      sessionId: session?.id || null,
      lectureId,
      date: new Date(),
      status,
      markedAt: new Date(),
      markedBy: req.user.userId,
      isManual: true,
      remarks: remarks || null,
    }).returning();

    await logAudit({
      userId: req.user.userId,
      action: 'attendance_marked',
      targetType: 'attendance',
      targetId: record.id,
      description: `Manual attendance: ${status} for student ${studentId}`,
    });

    sendSuccess(res, 201, 'Attendance marked manually', { attendance: record });
  } catch (error) {
    logger.error('Manual mark attendance failed:', error);
    sendError(res, 500, 'Failed to mark attendance.');
  }
};

/**
 * Teacher corrects an existing attendance record.
 */
export const correctAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const attendanceId = req.params.id as string;
    const { status, reason } = req.body;

    if (!status || !reason) {
      sendError(res, 400, 'New status and reason are required for correction.');
      return;
    }

    const db = getDB();

    const [existing] = await db.select().from(attendance)
      .where(eq(attendance.id, attendanceId))
      .limit(1);

    if (!existing) {
      sendError(res, 404, 'Attendance record not found.');
      return;
    }

    // Only allow teacher who created the session or an admin to correct
    if (existing.teacherId !== req.user.userId && req.user.role !== 'admin') {
      sendError(res, 403, 'You can only correct attendance for your own classes.');
      return;
    }

    const oldStatus = existing.status;

    const [updated] = await db.update(attendance)
      .set({
        status,
        remarks: `Corrected by ${req.user.role}: ${reason} (was: ${oldStatus})`,
        markedBy: req.user.userId,
        updatedAt: new Date(),
      })
      .where(eq(attendance.id, attendanceId))
      .returning();

    await logAudit({
      userId: req.user.userId,
      action: 'attendance_corrected',
      targetType: 'attendance',
      targetId: attendanceId,
      description: `Attendance changed from ${oldStatus} to ${status}. Reason: ${reason}`,
      metadata: { oldStatus, newStatus: status, reason, studentId: existing.studentId },
    });

    sendSuccess(res, 200, 'Attendance corrected', { attendance: updated });
  } catch (error) {
    logger.error('Correct attendance failed:', error);
    sendError(res, 500, 'Failed to correct attendance.');
  }
};

/**
 * Get attendance roster for a session/lecture.
 * Returns ALL enrolled students with their attendance status.
 */
export const getSessionRoster = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const lectureId = req.params.lectureId as string;
    const db = getDB();

    // Get session info
    const [session] = await db.select().from(attendanceSessions)
      .where(eq(attendanceSessions.lectureId, lectureId))
      .limit(1);

    if (!session) {
      sendError(res, 404, 'Session not found.');
      return;
    }

    // Get all enrolled students for this subject
    const enrolled = await db
      .select({
        studentId: enrollments.studentId,
        studentName: users.displayName,
        studentEmail: users.email,
        studentRollNumber: users.rollNumber,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(and(
        eq(enrollments.subjectId, session.subjectId),
        eq(enrollments.isActive, true),
      ))
      .orderBy(users.displayName);

    // Get attendance records for this lecture
    const records = await db.select().from(attendance)
      .where(eq(attendance.lectureId, lectureId));

    const attendanceMap = new Map(records.map(r => [r.studentId, r]));

    // Merge: enrolled students + attendance status
    const roster = enrolled.map(student => {
      const record = attendanceMap.get(student.studentId);
      return {
        ...student,
        attendanceId: record?.id || null,
        status: record?.status || 'pending',
        markedAt: record?.markedAt || null,
        isManual: record?.isManual || false,
        remarks: record?.remarks || null,
      };
    });

    const [subject] = await db.select().from(subjects).where(eq(subjects.id, session.subjectId)).limit(1);

    sendSuccess(res, 200, 'Session roster retrieved', {
      session,
      subject,
      roster,
      summary: {
        total: roster.length,
        present: roster.filter(r => r.status === 'present').length,
        absent: roster.filter(r => r.status === 'absent').length,
        late: roster.filter(r => r.status === 'late').length,
        pending: roster.filter(r => r.status === 'pending').length,
      },
    });
  } catch (error) {
    logger.error('Get session roster failed:', error);
    sendError(res, 500, 'Failed to retrieve session roster.');
  }
};

/**
 * Get attendance history for a student.
 */
export const getStudentAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const studentId = (req.params.studentId as string) || req.user.userId;
    const { subjectId, startDate, endDate, page = '1', limit = '20' } = req.query;

    const db = getDB();
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    // Build conditions
    const conditions = [eq(attendance.studentId, studentId)];
    if (subjectId) conditions.push(eq(attendance.subjectId, subjectId as string));
    if (startDate) conditions.push(gte(attendance.date, new Date(startDate as string)));
    if (endDate) conditions.push(lte(attendance.date, new Date(endDate as string)));

    const whereClause = and(...conditions);

    // Fetch records with joined subject and teacher info
    const records = await db
      .select({
        id: attendance.id,
        studentId: attendance.studentId,
        teacherId: attendance.teacherId,
        subjectId: attendance.subjectId,
        lectureId: attendance.lectureId,
        date: attendance.date,
        status: attendance.status,
        markedAt: attendance.markedAt,
        qrScannedAt: attendance.qrScannedAt,
        isManual: attendance.isManual,
        remarks: attendance.remarks,
        createdAt: attendance.createdAt,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        teacherName: users.displayName,
      })
      .from(attendance)
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .leftJoin(users, eq(attendance.teacherId, users.id))
      .where(whereClause)
      .orderBy(desc(attendance.date))
      .offset(offset)
      .limit(limitNum);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(attendance)
      .where(whereClause);

    sendSuccess(res, 200, 'Attendance history retrieved', {
      records,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Get attendance failed:', error);
    sendError(res, 500, 'Failed to retrieve attendance.');
  }
};

/**
 * Get attendance statistics (percentage, subject-wise breakdown).
 */
export const getAttendanceStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const studentId = (req.params.studentId as string) || req.user.userId;
    const db = getDB();

    // Subject-wise stats using SQL
    const stats = await db
      .select({
        subjectId: attendance.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        totalClasses: count(),
        presentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
        absentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'absent' THEN 1 ELSE 0 END)::int`,
        lateCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'late' THEN 1 ELSE 0 END)::int`,
      })
      .from(attendance)
      .leftJoin(subjects, eq(attendance.subjectId, subjects.id))
      .where(eq(attendance.studentId, studentId))
      .groupBy(attendance.subjectId, subjects.name, subjects.code);

    // Calculate percentage for each subject
    const subjectWise = stats.map((s) => ({
      ...s,
      percentage: s.totalClasses > 0
        ? Math.round((s.presentCount / s.totalClasses) * 1000) / 10
        : 0,
    }));

    // Overall statistics
    const overall = stats.reduce(
      (acc, s) => ({
        totalClasses: acc.totalClasses + s.totalClasses,
        presentCount: acc.presentCount + s.presentCount,
        absentCount: acc.absentCount + s.absentCount,
        lateCount: acc.lateCount + s.lateCount,
      }),
      { totalClasses: 0, presentCount: 0, absentCount: 0, lateCount: 0 }
    );

    const overallPercentage =
      overall.totalClasses > 0
        ? Math.round((overall.presentCount / overall.totalClasses) * 1000) / 10
        : 0;

    sendSuccess(res, 200, 'Attendance statistics retrieved', {
      subjectWise,
      overall: { ...overall, percentage: overallPercentage },
    });
  } catch (error) {
    logger.error('Get attendance stats failed:', error);
    sendError(res, 500, 'Failed to retrieve attendance statistics.');
  }
};
