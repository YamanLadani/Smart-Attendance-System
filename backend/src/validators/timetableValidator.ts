import { z } from 'zod';

export const createTimetableSchema = z.object({
  subjectId: z.string().min(1, 'Subject ID is required'),
  department: z.string().min(1, 'Department is required'),
  semester: z.number().min(1).max(8),
  division: z.string().min(1, 'Division is required'),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  room: z.string().min(1, 'Room is required'),
  type: z.enum(['lecture', 'practical', 'tutorial']).default('lecture'),
});

export const updateTimetableSchema = createTimetableSchema.partial();

export type CreateTimetableInput = z.infer<typeof createTimetableSchema>;
export type UpdateTimetableInput = z.infer<typeof updateTimetableSchema>;
