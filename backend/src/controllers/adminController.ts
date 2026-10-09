import { type Response } from 'express';
import { eq, and, gte, ilike, or, count, sql, desc, lte } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getDB } from '../config/db';
import { users, students, teachers, admins, attendance, settings, auditLogs, subjects, enrollments } from '../db/schema';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { logAudit } from '../services/auditService';

const SALT_ROUNDS = 12;

/**
 * Admin dashboard data with charts, distributions and trends.
 */
export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = getDB();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      [{ total: totalStudents }],
      [{ total: totalTeachers }],
      [{ total: totalAdmins }],
      [{ total: totalAttendanceToday }],
      [{ total: totalSubjects }],
    ] = await Promise.all([
      db.select({ total: count() }).from(users).where(and(eq(users.role, 'student'), eq(users.isActive, true))),
      db.select({ total: count() }).from(users).where(and(eq(users.role, 'teacher'), eq(users.isActive, true))),
      db.select({ total: count() }).from(users).where(and(eq(users.role, 'admin'), eq(users.isActive, true))),
      db.select({ total: count() }).from(attendance).where(gte(attendance.date, todayStart)),
      db.select({ total: count() }).from(subjects).where(eq(subjects.isActive, true)),
    ]);

    // Department breakdown
    const departments = await db
      .select({
        department: users.department,
        count: count(),
      })
      .from(users)
      .where(eq(users.isActive, true))
      .groupBy(users.department)
      .orderBy(sql`count(*) DESC`);

    // Semester breakdown for students
    const semesters = await db
      .select({
        semester: users.semester,
        count: count(),
      })
      .from(users)
      .where(and(eq(users.role, 'student'), eq(users.isActive, true)))
      .groupBy(users.semester)
      .orderBy(users.semester);

    // Recent activity (audit logs)
    const recentActivity = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        description: auditLogs.description,
        createdAt: auditLogs.createdAt,
        userName: users.displayName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);

    sendSuccess(res, 200, 'Admin dashboard data retrieved', {
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalAttendanceToday,
      totalSubjects,
      departments,
      semesters: semesters.filter(s => s.semester !== null),
      recentActivity,
    });
  } catch (error) {
    logger.error('Admin dashboard failed:', error);
    sendError(res, 500, 'Failed to load dashboard.');
  }
};

/**
 * Get all users with search, role, department, semester filters & pagination.
 */
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, department, semester, search, page = '1', limit = '50' } = req.query;

    const db = getDB();
    const conditions: ReturnType<typeof eq>[] = [];

    if (role) conditions.push(eq(users.role, role as 'student' | 'teacher' | 'admin'));
    if (department) conditions.push(eq(users.department, department as string));
    if (semester) conditions.push(eq(users.semester, parseInt(semester as string, 10)));
    if (search) {
      const searchTerm = `%${search as string}%`;
      conditions.push(
        or(
          ilike(users.displayName, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.rollNumber, searchTerm)
        )!
      );
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [usersList, [{ total }]] = await Promise.all([
      db.select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .offset(offset)
        .limit(limitNum),
      db.select({ total: count() })
        .from(users)
        .where(whereClause),
    ]);

    sendSuccess(res, 200, 'Users retrieved', {
      users: usersList,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    logger.error('Get users failed:', error);
    sendError(res, 500, 'Failed to retrieve users.');
  }
};

/**
 * Admin creates a new user (Student, Teacher, or Admin) with direct bcrypt password.
 */
export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const {
      email,
      password,
      displayName,
      role,
      department,
      semester,
      division,
      rollNumber,
      phone,
      enrollmentNumber,
      branch,
      batch,
      employeeId,
      designation,
      specialization,
      adminLevel,
    } = req.body;

    if (!email || !password || !displayName || !role) {
      sendError(res, 400, 'Email, password, name, and role are required.');
      return;
    }

    const db = getDB();

    // Check duplicate email
    const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (existing) {
      sendError(res, 409, 'An account with this email already exists.');
      return;
    }

    // Check admin uniqueness
    if (role === 'admin') {
      if (!department) {
        sendError(res, 400, 'Department is required for admin user.');
        return;
      }
      const existingDeptAdmin = await db
        .select()
        .from(users)
        .where(and(eq(users.role, 'admin'), eq(users.department, department.trim()), eq(users.isActive, true)))
        .limit(1);

      if (existingDeptAdmin.length > 0) {
        sendError(res, 409, `An active administrator already exists for the ${department} department.`);
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase().trim(),
        displayName: displayName.trim(),
        passwordHash,
        role,
        department: department?.trim() || null,
        semester: semester ? parseInt(semester, 10) : null,
        division: division?.trim() || null,
        rollNumber: rollNumber?.trim() || null,
        phone: phone?.trim() || null,
        isEmailVerified: true,
        isActive: true,
      })
      .returning();

    // Create role-specific profile
    if (role === 'student') {
      await db.insert(students).values({
        userId: user.id,
        enrollmentNumber: enrollmentNumber?.trim() || `ENR-${Date.now()}`,
        branch: branch?.trim() || department?.trim() || 'General',
        semester: semester ? parseInt(semester, 10) : 1,
        division: division?.trim() || 'A',
        rollNumber: rollNumber?.trim() || '0',
        batch: batch?.trim() || new Date().getFullYear().toString(),
      });
    } else if (role === 'teacher') {
      await db.insert(teachers).values({
        userId: user.id,
        employeeId: employeeId?.trim() || `EMP-${Date.now()}`,
        department: department?.trim() || 'General',
        designation: designation?.trim() || 'Lecturer',
        specialization: specialization?.trim() || null,
        subjects: [],
      });
    } else if (role === 'admin') {
      await db.insert(admins).values({
        userId: user.id,
        adminLevel: adminLevel || 'department',
        managedDepartments: department ? [department.trim()] : [],
      });
    }

    await logAudit({
      userId: req.user.userId,
      action: 'user_created',
      targetType: 'user',
      targetId: user.id,
      description: `Admin created user: ${user.displayName} (${user.email}) as ${role}`,
    });

    sendSuccess(res, 201, 'User created successfully', { user });
  } catch (error) {
    logger.error('Admin create user failed:', error);
    sendError(res, 500, 'Failed to create user.');
  }
};

/**
 * Admin updates a user's details (including protected identity fields like name, rollNumber, department).
 */
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const userId = req.params.id as string;
    const db = getDB();
    const {
      displayName,
      department,
      semester,
      division,
      rollNumber,
      phone,
      isActive,
      enrollmentNumber,
      branch,
      employeeId,
      designation,
      specialization,
    } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (department !== undefined) updateData.department = department?.trim() || null;
    if (semester !== undefined) updateData.semester = semester ? parseInt(semester, 10) : null;
    if (division !== undefined) updateData.division = division?.trim() || null;
    if (rollNumber !== undefined) updateData.rollNumber = rollNumber?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [user] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();

    if (!user) {
      sendError(res, 404, 'User not found.');
      return;
    }

    // Update profile based on role
    if (user.role === 'student') {
      const studentUpdate: Record<string, unknown> = { updatedAt: new Date() };
      if (enrollmentNumber !== undefined) studentUpdate.enrollmentNumber = enrollmentNumber;
      if (branch !== undefined) studentUpdate.branch = branch;
      if (semester !== undefined) studentUpdate.semester = semester ? parseInt(semester, 10) : 1;
      if (division !== undefined) studentUpdate.division = division;
      if (rollNumber !== undefined) studentUpdate.rollNumber = rollNumber;
      await db.update(students).set(studentUpdate).where(eq(students.userId, userId));
    } else if (user.role === 'teacher') {
      const teacherUpdate: Record<string, unknown> = { updatedAt: new Date() };
      if (employeeId !== undefined) teacherUpdate.employeeId = employeeId;
      if (department !== undefined) teacherUpdate.department = department;
      if (designation !== undefined) teacherUpdate.designation = designation;
      if (specialization !== undefined) teacherUpdate.specialization = specialization;
      await db.update(teachers).set(teacherUpdate).where(eq(teachers.userId, userId));
    }

    await logAudit({
      userId: req.user.userId,
      action: 'user_updated',
      targetType: 'user',
      targetId: userId,
      description: `Admin updated profile for: ${user.displayName} (${user.email})`,
    });

    sendSuccess(res, 200, 'User updated successfully', { user });
  } catch (error) {
    logger.error('Admin update user failed:', error);
    sendError(res, 500, 'Failed to update user.');
  }
};

/**
 * Admin directly resets a user's password.
 */
export const resetUserPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const userId = req.params.id as string;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      sendError(res, 400, 'Password must be at least 6 characters.');
      return;
    }

    const db = getDB();
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    const [user] = await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!user) {
      sendError(res, 404, 'User not found.');
      return;
    }

    await logAudit({
      userId: req.user.userId,
      action: 'user_updated',
      targetType: 'user',
      targetId: userId,
      description: `Admin reset password for user: ${user.email}`,
    });

    sendSuccess(res, 200, `Password reset successfully for ${user.displayName}`);
  } catch (error) {
    logger.error('Reset user password failed:', error);
    sendError(res, 500, 'Failed to reset password.');
  }
};

/**
 * Update a user's status (activate/deactivate).
 */
export const updateUserStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = getDB();
    const { isActive } = req.body;

    const [user] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, req.params.id as string))
      .returning();

    if (!user) {
      sendError(res, 404, 'User not found.');
      return;
    }

    if (req.user) {
      await logAudit({
        userId: req.user.userId,
        action: isActive ? 'user_activated' : 'user_deactivated',
        targetType: 'user',
        targetId: user.id,
        description: `User ${user.email} was ${isActive ? 'activated' : 'deactivated'}`,
      });
    }

    sendSuccess(res, 200, `User ${isActive ? 'activated' : 'deactivated'}`, { user });
  } catch (error) {
    logger.error('Update user status failed:', error);
    sendError(res, 500, 'Failed to update user status.');
  }
};

/**
 * Delete a user.
 */
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = getDB();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.params.id as string))
      .limit(1);

    if (!user) {
      sendError(res, 404, 'User not found.');
      return;
    }

    // Delete role-specific profile
    switch (user.role) {
      case 'student':
        await db.delete(students).where(eq(students.userId, user.id));
        break;
      case 'teacher':
        await db.delete(teachers).where(eq(teachers.userId, user.id));
        break;
      case 'admin':
        await db.delete(admins).where(eq(admins.userId, user.id));
        break;
    }

    await db.delete(users).where(eq(users.id, req.params.id as string));

    if (req.user) {
      await logAudit({
        userId: req.user.userId,
        action: 'user_deactivated',
        targetType: 'user',
        targetId: user.id,
        description: `User deleted: ${user.email}`,
      });
    }

    sendSuccess(res, 200, 'User deleted');
  } catch (error) {
    logger.error('Delete user failed:', error);
    sendError(res, 500, 'Failed to delete user.');
  }
};

/**
 * Get system settings.
 */
export const getSettings = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const db = getDB();
    const allSettings = await db.select().from(settings);
    sendSuccess(res, 200, 'Settings retrieved', { settings: allSettings });
  } catch (error) {
    logger.error('Get settings failed:', error);
    sendError(res, 500, 'Failed to retrieve settings.');
  }
};

export const updateSetting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const { key, value, description, category } = req.body;

    const [existing] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    let setting;
    if (existing) {
      [setting] = await db
        .update(settings)
        .set({ value, description, category, updatedBy: req.user.userId, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
    } else {
      [setting] = await db
        .insert(settings)
        .values({ key, value, description, category, updatedBy: req.user.userId })
        .returning();
    }

    sendSuccess(res, 200, 'Setting updated', { setting });
  } catch (error) {
    logger.error('Update setting failed:', error);
    sendError(res, 500, 'Failed to update setting.');
  }
};

/**
 * Get attendance analytics for admin.
 */
export const getAttendanceAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const db = getDB();
    const conditions: ReturnType<typeof eq>[] = [];

    if (startDate) conditions.push(gte(attendance.date, new Date(startDate as string)));
    if (endDate) conditions.push(lte(attendance.date, new Date(endDate as string)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const overallStats = await db
      .select({
        total: count(),
        present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
        absent: sql<number>`SUM(CASE WHEN ${attendance.status} = 'absent' THEN 1 ELSE 0 END)::int`,
        late: sql<number>`SUM(CASE WHEN ${attendance.status} = 'late' THEN 1 ELSE 0 END)::int`,
      })
      .from(attendance)
      .where(whereClause);

    const monthlyTrend = await db
      .select({
        month: sql<string>`TO_CHAR(${attendance.date}, 'YYYY-MM')`,
        total: count(),
        present: sql<number>`SUM(CASE WHEN ${attendance.status} = 'present' THEN 1 ELSE 0 END)::int`,
      })
      .from(attendance)
      .where(whereClause)
      .groupBy(sql`TO_CHAR(${attendance.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${attendance.date}, 'YYYY-MM')`);

    sendSuccess(res, 200, 'Attendance analytics retrieved', {
      overall: overallStats[0] || { total: 0, present: 0, absent: 0, late: 0 },
      monthlyTrend,
    });
  } catch (error) {
    logger.error('Get attendance analytics failed:', error);
    sendError(res, 500, 'Failed to retrieve analytics.');
  }
};

/**
 * Get audit logs.
 */
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action, userId, startDate, endDate, page = '1', limit = '50' } = req.query;

    const db = getDB();
    const conditions: ReturnType<typeof eq>[] = [];

    if (action) conditions.push(eq(auditLogs.action, action as typeof auditLogs.$inferSelect['action']));
    if (userId) conditions.push(eq(auditLogs.userId, userId as string));
    if (startDate) conditions.push(gte(auditLogs.createdAt, new Date(startDate as string)));
    if (endDate) conditions.push(lte(auditLogs.createdAt, new Date(endDate as string)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const [logs, [{ total }]] = await Promise.all([
      db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.displayName,
          userEmail: users.email,
          action: auditLogs.action,
          targetType: auditLogs.targetType,
          targetId: auditLogs.targetId,
          description: auditLogs.description,
          metadata: auditLogs.metadata,
          createdAt: auditLogs.createdAt,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .offset(offset)
        .limit(limitNum),
      db.select({ total: count() }).from(auditLogs).where(whereClause),
    ]);

    sendSuccess(res, 200, 'Audit logs retrieved', {
      logs,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    logger.error('Get audit logs failed:', error);
    sendError(res, 500, 'Failed to retrieve audit logs.');
  }
};

/**
 * Get all subjects.
 */
export const getSubjects = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, semester } = req.query;

    const db = getDB();
    const conditions: ReturnType<typeof eq>[] = [];

    if (department) conditions.push(eq(subjects.department, department as string));
    if (semester) conditions.push(eq(subjects.semester, parseInt(semester as string, 10)));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const subjectsList = await db
      .select({
        id: subjects.id,
        name: subjects.name,
        code: subjects.code,
        department: subjects.department,
        semester: subjects.semester,
        year: subjects.year,
        credits: subjects.credits,
        type: subjects.type,
        teacherId: subjects.teacherId,
        teacherName: users.displayName,
        isActive: subjects.isActive,
        createdAt: subjects.createdAt,
      })
      .from(subjects)
      .leftJoin(users, eq(subjects.teacherId, users.id))
      .where(whereClause)
      .orderBy(subjects.semester, subjects.name);

    const enrollmentCounts = await db
      .select({
        subjectId: enrollments.subjectId,
        studentCount: sql<number>`COUNT(*)::int`,
      })
      .from(enrollments)
      .where(eq(enrollments.isActive, true))
      .groupBy(enrollments.subjectId);

    const countMap = new Map(enrollmentCounts.map(e => [e.subjectId, e.studentCount]));

    const enriched = subjectsList.map(s => ({
      ...s,
      enrolledStudents: countMap.get(s.id) || 0,
    }));

    sendSuccess(res, 200, 'Subjects retrieved', { subjects: enriched, total: enriched.length });
  } catch (error) {
    logger.error('Get subjects failed:', error);
    sendError(res, 500, 'Failed to retrieve subjects.');
  }
};

/**
 * Create a new subject.
 */
export const createSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const { name, code, department, semester, year, credits, type, teacherId, teachingHours, academicYear } = req.body;

    if (!name || !code || !department || !semester) {
      sendError(res, 400, 'Name, code, department, and semester are required.');
      return;
    }

    const [existing] = await db.select().from(subjects).where(eq(subjects.code, code)).limit(1);
    if (existing) {
      sendError(res, 409, `Subject with code "${code}" already exists.`);
      return;
    }

    const [subject] = await db.insert(subjects).values({
      name,
      code: code.toUpperCase(),
      department,
      semester: parseInt(semester, 10),
      year: year ? parseInt(year, 10) : null,
      credits: credits ? parseInt(credits, 10) : 0,
      type: type || 'core',
      teacherId: teacherId || null,
      teachingHours: teachingHours ? parseInt(teachingHours, 10) : null,
      academicYear: academicYear || null,
    }).returning();

    await logAudit({
      userId: req.user.userId,
      action: 'subject_created',
      targetType: 'subject',
      targetId: subject.id,
      description: `Subject created: ${name} (${code})`,
    });

    sendSuccess(res, 201, 'Subject created', { subject });
  } catch (error) {
    logger.error('Create subject failed:', error);
    sendError(res, 500, 'Failed to create subject.');
  }
};

/**
 * Update a subject.
 */
export const updateSubject = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const subjectId = req.params.id as string;
    const { name, department, semester, year, credits, type, teacherId, isActive, teachingHours, academicYear } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (department !== undefined) updateData.department = department;
    if (semester !== undefined) updateData.semester = parseInt(semester, 10);
    if (year !== undefined) updateData.year = parseInt(year, 10);
    if (credits !== undefined) updateData.credits = parseInt(credits, 10);
    if (type !== undefined) updateData.type = type;
    if (teacherId !== undefined) updateData.teacherId = teacherId || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (teachingHours !== undefined) updateData.teachingHours = parseInt(teachingHours, 10);
    if (academicYear !== undefined) updateData.academicYear = academicYear;

    const [subject] = await db.update(subjects)
      .set(updateData)
      .where(eq(subjects.id, subjectId))
      .returning();

    if (!subject) {
      sendError(res, 404, 'Subject not found.');
      return;
    }

    await logAudit({
      userId: req.user.userId,
      action: 'subject_updated',
      targetType: 'subject',
      targetId: subjectId,
      description: `Subject updated: ${subject.name} (${subject.code})`,
    });

    sendSuccess(res, 200, 'Subject updated', { subject });
  } catch (error) {
    logger.error('Update subject failed:', error);
    sendError(res, 500, 'Failed to update subject.');
  }
};
