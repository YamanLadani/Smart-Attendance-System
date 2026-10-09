import { type Response } from 'express';
import { eq, and, count, sql, inArray } from 'drizzle-orm';
import { getDB } from '../config/db';
import { enrollments, subjects, users, attendance } from '../db/schema';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { logAudit } from '../services/auditService';

/**
 * Enroll a student in a subject.
 * Can be called by admin or teacher (who teaches the subject).
 */
export const enrollStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    let { studentId, subjectId } = req.body;

    // If caller is a student, self-enroll using their authenticated userId
    if (req.user.role === 'student') {
      studentId = req.user.userId;
    }

    if (!studentId || !subjectId) {
      sendError(res, 400, 'Student ID and Subject ID are required.');
      return;
    }

    const db = getDB();

    // Verify student exists
    const [student] = await db.select().from(users)
      .where(and(eq(users.id, studentId), eq(users.role, 'student')))
      .limit(1);
    if (!student) {
      sendError(res, 404, 'Student not found.');
      return;
    }

    // Verify subject exists
    const [subject] = await db.select().from(subjects)
      .where(eq(subjects.id, subjectId))
      .limit(1);
    if (!subject) {
      sendError(res, 404, 'Subject not found.');
      return;
    }

    // Strict Semester Isolation: Student can only enroll in subjects of their own registered semester
    if (req.user.role === 'student' && student.semester && subject.semester !== student.semester) {
      sendError(res, 403, `You are registered in Semester ${student.semester}. You cannot enroll in Semester ${subject.semester} courses.`);
      return;
    }

    // Check if already enrolled
    const [existing] = await db.select().from(enrollments)
      .where(and(eq(enrollments.studentId, studentId), eq(enrollments.subjectId, subjectId)))
      .limit(1);

    if (existing) {
      if (existing.isActive) {
        sendError(res, 409, 'Student is already enrolled in this subject.');
        return;
      }
      // Re-activate enrollment
      const [updated] = await db.update(enrollments)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(enrollments.id, existing.id))
        .returning();
      sendSuccess(res, 200, 'Enrollment reactivated', { enrollment: updated });
      return;
    }

    // Create enrollment
    const [enrollment] = await db.insert(enrollments).values({
      studentId,
      subjectId,
      enrolledBy: req.user.userId,
    }).returning();

    await logAudit({
      userId: req.user.userId,
      action: 'enrollment_created',
      targetType: 'enrollment',
      targetId: enrollment.id,
      description: `Student ${student.displayName} enrolled in ${subject.name} (${subject.code})`,
    });

    sendSuccess(res, 201, 'Student enrolled successfully', { enrollment });
  } catch (error) {
    logger.error('Enroll student failed:', error);
    sendError(res, 500, 'Failed to enroll student.');
  }
};

/**
 * Bulk enroll students in a subject.
 */
export const bulkEnroll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const { studentIds, subjectId } = req.body;

    if (!studentIds?.length || !subjectId) {
      sendError(res, 400, 'Student IDs and Subject ID are required.');
      return;
    }

    const db = getDB();

    // Verify subject
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (!subject) {
      sendError(res, 404, 'Subject not found.');
      return;
    }

    let enrolled = 0;
    let skipped = 0;

    for (const studentId of studentIds) {
      try {
        const [existing] = await db.select().from(enrollments)
          .where(and(eq(enrollments.studentId, studentId), eq(enrollments.subjectId, subjectId)))
          .limit(1);

        if (existing) {
          if (!existing.isActive) {
            await db.update(enrollments)
              .set({ isActive: true, updatedAt: new Date() })
              .where(eq(enrollments.id, existing.id));
            enrolled++;
          } else {
            skipped++;
          }
        } else {
          await db.insert(enrollments).values({
            studentId,
            subjectId,
            enrolledBy: req.user.userId,
          });
          enrolled++;
        }
      } catch {
        skipped++;
      }
    }

    await logAudit({
      userId: req.user.userId,
      action: 'enrollment_created',
      targetType: 'subject',
      targetId: subjectId,
      description: `Bulk enrollment: ${enrolled} students enrolled, ${skipped} skipped for ${subject.name}`,
    });

    sendSuccess(res, 200, `${enrolled} students enrolled, ${skipped} skipped`, { enrolled, skipped });
  } catch (error) {
    logger.error('Bulk enroll failed:', error);
    sendError(res, 500, 'Failed to bulk enroll students.');
  }
};

/**
 * Remove enrollment (soft-delete by setting isActive=false).
 */
export const removeEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const enrollmentId = req.params.id as string;
    const db = getDB();

    const [enrollment] = await db.update(enrollments)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(enrollments.id, enrollmentId))
      .returning();

    if (!enrollment) {
      sendError(res, 404, 'Enrollment not found.');
      return;
    }

    await logAudit({
      userId: req.user.userId,
      action: 'enrollment_removed',
      targetType: 'enrollment',
      targetId: enrollmentId,
      description: `Enrollment removed`,
    });

    sendSuccess(res, 200, 'Enrollment removed');
  } catch (error) {
    logger.error('Remove enrollment failed:', error);
    sendError(res, 500, 'Failed to remove enrollment.');
  }
};

/**
 * Get enrolled students for a subject.
 * Returns ALL enrolled students with their attendance stats (even if never attended).
 */
export const getEnrolledStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const subjectId = req.params.subjectId as string;
    const db = getDB();

    // Get subject info
    const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
    if (!subject) {
      sendError(res, 404, 'Subject not found.');
      return;
    }

    // Get all enrolled students
    const enrolledStudents = await db
      .select({
        enrollmentId: enrollments.id,
        studentId: enrollments.studentId,
        studentName: users.displayName,
        studentEmail: users.email,
        studentRollNumber: users.rollNumber,
        studentDepartment: users.department,
        studentSemester: users.semester,
        enrolledAt: enrollments.enrolledAt,
        isActive: enrollments.isActive,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(and(
        eq(enrollments.subjectId, subjectId),
        eq(enrollments.isActive, true),
      ))
      .orderBy(users.displayName);

    // Get attendance stats per student for this subject
    const attendanceStats = await db
      .select({
        studentId: attendance.studentId,
        totalClasses: count(),
        presentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
        absentCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'absent' THEN 1 ELSE 0 END)::int`,
        lateCount: sql<number>`SUM(CASE WHEN ${attendance.status} = 'late' THEN 1 ELSE 0 END)::int`,
      })
      .from(attendance)
      .where(eq(attendance.subjectId, subjectId))
      .groupBy(attendance.studentId);

    // Merge enrollment data with attendance stats
    const statsMap = new Map(attendanceStats.map(s => [s.studentId, s]));

    const studentsWithStats = enrolledStudents.map(student => {
      const stats = statsMap.get(student.studentId);
      const totalClasses = stats?.totalClasses || 0;
      const presentCount = stats?.presentCount || 0;
      return {
        ...student,
        totalClasses,
        presentCount,
        absentCount: stats?.absentCount || 0,
        lateCount: stats?.lateCount || 0,
        attendancePercentage: totalClasses > 0
          ? Math.round((presentCount / totalClasses) * 1000) / 10
          : 0,
      };
    });

    sendSuccess(res, 200, 'Enrolled students retrieved', {
      subject,
      students: studentsWithStats,
      totalStudents: studentsWithStats.length,
    });
  } catch (error) {
    logger.error('Get enrolled students failed:', error);
    sendError(res, 500, 'Failed to retrieve enrolled students.');
  }
};

/**
 * Get a student's enrolled subjects.
 */
export const getStudentEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const studentId = (req.params.studentId as string) || req.user.userId;
    const db = getDB();

    const enrolledSubjects = await db
      .select({
        enrollmentId: enrollments.id,
        subjectId: enrollments.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        subjectDepartment: subjects.department,
        subjectSemester: subjects.semester,
        subjectType: subjects.type,
        credits: subjects.credits,
        teacherName: users.displayName,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .innerJoin(subjects, eq(enrollments.subjectId, subjects.id))
      .leftJoin(users, eq(subjects.teacherId, users.id))
      .where(and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.isActive, true),
      ))
      .orderBy(subjects.semester, subjects.name);

    sendSuccess(res, 200, 'Enrollments retrieved', {
      enrollments: enrolledSubjects,
      totalSubjects: enrolledSubjects.length,
    });
  } catch (error) {
    logger.error('Get student enrollments failed:', error);
    sendError(res, 500, 'Failed to retrieve enrollments.');
  }
};

/**
 * Get all enrollments (admin view) with optional filters.
 */
export const getAllEnrollments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const { subjectId, department, semester } = req.query;
    const db = getDB();

    const conditions = [eq(enrollments.isActive, true)];
    if (subjectId) conditions.push(eq(enrollments.subjectId, subjectId as string));

    const results = await db
      .select({
        enrollmentId: enrollments.id,
        studentId: enrollments.studentId,
        studentName: users.displayName,
        studentEmail: users.email,
        studentRollNumber: users.rollNumber,
        subjectId: enrollments.subjectId,
        subjectName: subjects.name,
        subjectCode: subjects.code,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .innerJoin(subjects, eq(enrollments.subjectId, subjects.id))
      .where(and(...conditions))
      .orderBy(subjects.name, users.displayName)
      .limit(200);

    sendSuccess(res, 200, 'Enrollments retrieved', {
      enrollments: results,
      total: results.length,
    });
  } catch (error) {
    logger.error('Get all enrollments failed:', error);
    sendError(res, 500, 'Failed to retrieve enrollments.');
  }
};
