import { z } from 'zod';

export const markAttendanceSchema = z.object({
  qrData: z.string().min(1, 'QR data is required'),
});

export const generateQRSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  timetableId: z.string().optional(),
  expirySeconds: z.number().min(5).max(3600).optional().default(30),
});

export const attendanceFilterSchema = z.object({
  studentId: z.string().optional(),
  subjectId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['present', 'absent', 'late']).optional(),
  department: z.string().optional(),
  semester: z.coerce.number().min(1).max(8).optional(),
  division: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type GenerateQRInput = z.infer<typeof generateQRSchema>;
export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
