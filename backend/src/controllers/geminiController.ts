import { type Response } from 'express';
import { eq, and, count, desc } from 'drizzle-orm';
import { getDB } from '../config/db';
import { geminiHistory, students, users, attendance } from '../db/schema';
import type { AuthRequest } from '../middlewares/authMiddleware';
import {
  generateStudyPlan,
  generateRevisionTopics,
  generateQuiz,
  generateChat,
  generateActivityRecommendation,
} from '../services/geminiService';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Generate a personalized study plan using Gemini AI.
 */
export const getStudyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();

    const [studentProfile] = await db
      .select()
      .from(students)
      .where(eq(students.userId, req.user.userId))
      .limit(1);

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    const branch = studentProfile?.branch || userRecord?.department || 'Computer Science';
    const semester = studentProfile?.semester || userRecord?.semester || 5;
    const name = userRecord?.displayName || req.user.email?.split('@')[0] || 'Student';
    const strongSubjects = studentProfile?.strongSubjects || [];
    const weakSubjects = studentProfile?.weakSubjects || [];
    const careerGoal = studentProfile?.careerGoal || undefined;

    // Calculate attendance percentage
    const [{ total: totalAttendance }] = await db
      .select({ total: count() })
      .from(attendance)
      .where(eq(attendance.studentId, req.user.userId));

    const [{ total: presentCount }] = await db
      .select({ total: count() })
      .from(attendance)
      .where(and(eq(attendance.studentId, req.user.userId), eq(attendance.status, 'present')));

    const attendancePercent = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    const { freePeriodDuration } = req.body;

    const response = await generateStudyPlan({
      name,
      branch,
      semester,
      strongSubjects,
      weakSubjects,
      careerGoal,
      attendancePercent,
      freePeriodDuration: freePeriodDuration || 45,
    });

    // Save to history (graceful)
    let historyId: string | undefined;
    try {
      const [history] = await db
        .insert(geminiHistory)
        .values({
          studentId: req.user.userId,
          prompt: `Study plan for ${branch} semester ${semester}`,
          response,
          type: 'study_plan',
          metadata: {
            branch,
            semester,
            subjects: [...strongSubjects, ...weakSubjects],
            attendancePercent,
          },
        })
        .returning();
      historyId = history?.id;
    } catch (hErr) {
      logger.warn('Failed to save study plan to history:', hErr);
    }

    sendSuccess(res, 200, 'Study plan generated', { plan: response, historyId });
  } catch (error: any) {
    logger.error('Generate study plan failed:', error);
    sendError(res, 500, error?.message || 'Failed to generate study plan. Check your Gemini API key.');
  }
};

/**
 * Generate revision topics for a subject.
 */
export const getRevisionTopics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const subject = req.params.subject as string;

    const [studentProfile] = await db
      .select()
      .from(students)
      .where(eq(students.userId, req.user.userId))
      .limit(1);

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    const semester = studentProfile?.semester || userRecord?.semester || 5;
    const branch = studentProfile?.branch || userRecord?.department || 'Computer Science';

    const response = await generateRevisionTopics(subject, semester, branch);

    try {
      await db.insert(geminiHistory).values({
        studentId: req.user.userId,
        prompt: `Revision topics for ${subject}`,
        response,
        type: 'revision',
      });
    } catch (hErr) {
      logger.warn('Failed to save revision to history:', hErr);
    }

    sendSuccess(res, 200, 'Revision topics generated', { topics: response });
  } catch (error: any) {
    logger.error('Generate revision topics failed:', error);
    sendError(res, 500, error?.message || 'Failed to generate revision topics.');
  }
};

/**
 * Generate a quiz for a subject.
 */
export const getQuiz = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const subject = req.params.subject as string;
    const { numQuestions } = req.query;

    const response = await generateQuiz(subject, parseInt(numQuestions as string, 10) || 5);

    try {
      await db.insert(geminiHistory).values({
        studentId: req.user.userId,
        prompt: `Quiz for ${subject}`,
        response,
        type: 'quiz',
      });
    } catch (hErr) {
      logger.warn('Failed to save quiz to history:', hErr);
    }

    sendSuccess(res, 200, 'Quiz generated', { quiz: response });
  } catch (error: any) {
    logger.error('Generate quiz failed:', error);
    sendError(res, 500, error?.message || 'Failed to generate quiz.');
  }
};

/**
 * Chat with AI assistant.
 */
export const chat = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      sendError(res, 400, 'Message is required.');
      return;
    }

    const [studentProfile] = await db
      .select()
      .from(students)
      .where(eq(students.userId, req.user.userId))
      .limit(1);

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    const response = await generateChat(message.trim(), {
      branch: studentProfile?.branch || userRecord?.department || 'Computer Science',
      semester: studentProfile?.semester || userRecord?.semester || 5,
      careerGoal: studentProfile?.careerGoal || undefined,
    });

    // Save to history (graceful)
    try {
      await db.insert(geminiHistory).values({
        studentId: req.user.userId,
        prompt: message.trim(),
        response,
        type: 'study_plan',
      });
    } catch (histErr) {
      logger.warn('Failed to save chat to history:', histErr);
    }

    sendSuccess(res, 200, 'Chat response generated', { response });
  } catch (error: any) {
    logger.error('Chat failed:', error);
    sendError(res, 500, error?.message || 'Failed to generate response. Check your Gemini API key.');
  }
};

/**
 * Get personalized activity recommendations for free periods.
 */
export const getActivityRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const { freePeriodMinutes } = req.body;

    const [studentProfile] = await db
      .select()
      .from(students)
      .where(eq(students.userId, req.user.userId))
      .limit(1);

    const [userRecord] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    // Get recent AI history for context
    let recentActivities: string[] = [];
    try {
      const recentHistory = await db
        .select({ prompt: geminiHistory.prompt })
        .from(geminiHistory)
        .where(eq(geminiHistory.studentId, req.user.userId))
        .orderBy(desc(geminiHistory.createdAt))
        .limit(5);
      recentActivities = recentHistory.map((h) => h.prompt);
    } catch {
      // Ignored
    }

    const name = userRecord?.displayName || req.user.email?.split('@')[0] || 'Student';
    const branch = studentProfile?.branch || userRecord?.department || 'Computer Science';
    const semester = studentProfile?.semester || userRecord?.semester || 5;

    const response = await generateActivityRecommendation({
      name,
      branch,
      semester,
      freePeriodMinutes: freePeriodMinutes || 45,
      strongSubjects: studentProfile?.strongSubjects || [],
      weakSubjects: studentProfile?.weakSubjects || [],
      careerGoal: studentProfile?.careerGoal || undefined,
      currentTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      recentActivities,
    });

    try {
      await db.insert(geminiHistory).values({
        studentId: req.user.userId,
        prompt: `Activity recommendations for ${freePeriodMinutes || 45} min free period`,
        response,
        type: 'time_management',
      });
    } catch (hErr) {
      logger.warn('Failed to save activity recommendation to history:', hErr);
    }

    sendSuccess(res, 200, 'Activity recommendations generated', { recommendations: response });
  } catch (error: any) {
    logger.error('Activity recommendations failed:', error);
    sendError(res, 500, error?.message || 'Failed to generate recommendations.');
  }
};

/**
 * Get Gemini history for the current student.
 */
export const getHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 401, 'Not authenticated.');
      return;
    }

    const db = getDB();
    const { type, page = '1', limit = '10' } = req.query;

    const conditions = [eq(geminiHistory.studentId, req.user.userId)];
    if (type) conditions.push(eq(geminiHistory.type, type as any));

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const whereClause = and(...conditions);

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(geminiHistory)
        .where(whereClause)
        .orderBy(desc(geminiHistory.createdAt))
        .offset(offset)
        .limit(limitNum),
      db.select({ total: count() }).from(geminiHistory).where(whereClause),
    ]);

    sendSuccess(res, 200, 'History retrieved', {
      items,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  } catch (error: any) {
    logger.error('Get Gemini history failed:', error);
    sendError(res, 500, error?.message || 'Failed to retrieve history.');
  }
};
