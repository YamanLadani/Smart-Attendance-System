import { type Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { generatePDFReport, generateCSVReport } from '../services/reportService';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Generate and download attendance report as PDF.
 */
export const downloadPDFReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId, department, semester, startDate, endDate, title } = req.query;

    const studentId = req.user?.role === 'student' ? req.user.userId : (req.query.studentId as string);
    const teacherId = req.user?.role === 'teacher' ? req.user.userId : (req.query.teacherId as string);

    await generatePDFReport(res, {
      studentId,
      teacherId,
      subjectId: subjectId as string,
      department: department as string,
      semester: semester ? parseInt(semester as string, 10) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
      title: (title as string) || (req.user?.role === 'student' ? 'Student Attendance Transcript' : 'Class Attendance Report'),
    });
  } catch (error) {
    logger.error('PDF report generation failed:', error);
    sendError(res, 500, 'Failed to generate PDF report.');
  }
};

/**
 * Generate and download attendance report as CSV.
 */
export const downloadCSVReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subjectId, department, semester, startDate, endDate } = req.query;

    const studentId = req.user?.role === 'student' ? req.user.userId : (req.query.studentId as string);
    const teacherId = req.user?.role === 'teacher' ? req.user.userId : (req.query.teacherId as string);

    await generateCSVReport(res, {
      studentId,
      teacherId,
      subjectId: subjectId as string,
      department: department as string,
      semester: semester ? parseInt(semester as string, 10) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
    });
  } catch (error) {
    logger.error('CSV report generation failed:', error);
    sendError(res, 500, 'Failed to generate CSV report.');
  }
};
