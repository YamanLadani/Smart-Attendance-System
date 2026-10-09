import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  displayName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  role: z.enum(['student', 'teacher', 'admin']),
  firebaseUid: z.string().min(1, 'Firebase UID is required'),
  department: z.string().optional(),
  semester: z.number().min(1).max(8).optional(),
  division: z.string().optional(),
  rollNumber: z.string().optional(),
  phone: z.string().optional(),
  // Student-specific fields
  enrollmentNumber: z.string().optional(),
  branch: z.string().optional(),
  batch: z.string().optional(),
  // Teacher-specific fields
  employeeId: z.string().optional(),
  designation: z.string().optional(),
  specialization: z.string().optional(),
  subjects: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  firebaseUid: z.string().min(1, 'Firebase UID is required'),
  email: z.string().email('Invalid email address'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  photoURL: z.string().url().optional(),
  // Student fields
  strongSubjects: z.array(z.string()).optional(),
  weakSubjects: z.array(z.string()).optional(),
  careerGoal: z.string().optional(),
  // Teacher fields
  specialization: z.string().optional(),
  qualification: z.string().optional(),
  experience: z.number().min(0).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
