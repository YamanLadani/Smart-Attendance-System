import api from './client';
import type {
  ApiResponse,
  AuthResponse,
  User,
  StudentProfile,
  TeacherProfile,
  AdminProfile,
  AttendanceRecord,
  AttendanceStats,
  QRGenerateResponse,
  TimetableEntry,
  FreePeriod,
  Subject,
  Goal,
  GeminiHistoryItem,
  Notification,
  StudentDashboardData,
  TeacherDashboardData,
  AdminDashboardData,
  Enrollment,
  AuditLog,
} from '@/types';

// ─── Auth API ────────────────────────────────────────────────────────
export const authApi = {
  register: (data: Record<string, unknown>) =>
    api.post<ApiResponse<AuthResponse>>('/auth/register', data),

  login: (data: { firebaseUid: string; email: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login', data),

  loginWithPassword: (data: { email: string; password: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login-password', data),

  loginWithOtp: (data: { email: string; otp: string }) =>
    api.post<ApiResponse<AuthResponse>>('/auth/login-otp', data),

  googleAuth: (data: { idToken: string; role?: string; department?: string; semester?: number; division?: string; rollNumber?: string; phone?: string; enrollmentNumber?: string; branch?: string; batch?: string; employeeId?: string; designation?: string }) =>
    api.post<ApiResponse<AuthResponse & { isNewUser?: boolean }>>('/auth/google', data),

  sendOtp: (data: { email: string; purpose: 'verification' | 'password_reset' | 'login' }) =>
    api.post<ApiResponse<void>>('/auth/send-otp', data),

  verifyOtp: (data: { email: string; otp: string; purpose?: 'verification' | 'password_reset' | 'login' }) =>
    api.post<ApiResponse<{ userId?: string }>>('/auth/verify-otp', data),

  forgotPassword: (data: { email: string }) =>
    api.post<ApiResponse<void>>('/auth/forgot-password', data),

  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api.post<ApiResponse<void>>('/auth/reset-password', data),

  changePassword: (data: { currentPassword?: string; newPassword: string }) =>
    api.post<ApiResponse<void>>('/auth/change-password', data),

  getProfile: () =>
    api.get<ApiResponse<{ user: User; profile: StudentProfile | TeacherProfile | AdminProfile }>>('/auth/profile'),

  updateProfile: (data: Record<string, unknown>) =>
    api.put<ApiResponse<{ user: User }>>('/auth/profile', data),
};

// ─── Attendance API ──────────────────────────────────────────────────
export const attendanceApi = {
  generateQR: (data: { subjectId: string; timetableId?: string; expirySeconds?: number }) =>
    api.post<ApiResponse<QRGenerateResponse>>('/attendance/qr/generate', data),

  markAttendance: (qrData: string) =>
    api.post<ApiResponse<{ attendance: AttendanceRecord }>>('/attendance/mark', { qrData }),

  manualMark: (data: { studentId: string; subjectId: string; lectureId: string; status: string; remarks?: string }) =>
    api.post<ApiResponse<{ attendance: AttendanceRecord }>>('/attendance/manual', data),

  correctAttendance: (id: string, data: { status: string; reason: string }) =>
    api.patch<ApiResponse<{ attendance: AttendanceRecord }>>(`/attendance/${id}/correct`, data),

  getSessionRoster: (lectureId: string) =>
    api.get<ApiResponse<{ session: unknown; subject: Subject; roster: unknown[]; summary: unknown }>>(`/attendance/session/${lectureId}/roster`),

  getHistory: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ records: AttendanceRecord[]; pagination: unknown }>>('/attendance/history', { params }),

  getStats: (studentId?: string) =>
    api.get<ApiResponse<AttendanceStats>>(studentId ? `/attendance/stats/${studentId}` : '/attendance/stats'),
};

// ─── Student API ─────────────────────────────────────────────────────
export const studentApi = {
  getDashboard: () =>
    api.get<ApiResponse<StudentDashboardData>>('/student/dashboard'),

  getGoals: (type?: string) =>
    api.get<ApiResponse<{ goals: Goal[] }>>('/student/goals', { params: type ? { type } : undefined }),

  createGoal: (data: Record<string, unknown>) =>
    api.post<ApiResponse<{ goal: Goal }>>('/student/goals', data),

  updateGoal: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<{ goal: Goal }>>(`/student/goals/${id}`, data),

  getBookmarks: () =>
    api.get<ApiResponse<{ bookmarks: GeminiHistoryItem[] }>>('/student/bookmarks'),

  toggleBookmark: (id: string) =>
    api.patch<ApiResponse<{ item: GeminiHistoryItem }>>(`/student/bookmarks/${id}/toggle`),

  getNotes: () =>
    api.get<ApiResponse<{ notes: any[] }>>('/student/notes'),
};

// ─── Teacher API ─────────────────────────────────────────────────────
export const teacherApi = {
  getDashboard: () =>
    api.get<ApiResponse<TeacherDashboardData>>('/teacher/dashboard'),

  searchStudents: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ students: User[] }>>('/teacher/students/search', { params }),

  getStudentsBySubject: (subjectId: string) =>
    api.get<ApiResponse<{ subject: Subject; students: unknown[]; totalStudents: number }>>(`/teacher/subjects/${subjectId}/students`),

  getClassStudents: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ students: User[] }>>('/teacher/students/class', { params }),

  getNotes: () =>
    api.get<ApiResponse<{ notes: any[] }>>('/teacher/notes'),

  uploadNote: (formData: FormData) =>
    api.post<ApiResponse<unknown>>('/teacher/notes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteNote: (id: string) =>
    api.delete<ApiResponse<void>>(`/teacher/notes/${id}`),

  getAnalytics: () =>
    api.get<ApiResponse<unknown>>('/teacher/analytics'),
};

// ─── Enrollment API ─────────────────────────────────────────────────
export const enrollmentApi = {
  getEnrolledStudents: (subjectId: string) =>
    api.get<ApiResponse<{ subject: Subject; students: Enrollment[]; totalStudents: number }>>(`/enrollments/subject/${subjectId}/students`),

  getStudentEnrollments: (studentId?: string) =>
    api.get<ApiResponse<{ enrollments: Enrollment[]; totalSubjects: number }>>( studentId ? `/enrollments/student/${studentId}` : '/enrollments/student'),

  getAllEnrollments: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ enrollments: Enrollment[]; total: number }>>('/enrollments', { params }),

  enroll: (data: { studentId: string; subjectId: string }) =>
    api.post<ApiResponse<{ enrollment: Enrollment }>>('/enrollments', data),

  bulkEnroll: (data: { studentIds: string[]; subjectId: string }) =>
    api.post<ApiResponse<{ enrolled: number; skipped: number }>>('/enrollments/bulk', data),

  remove: (id: string) =>
    api.delete<ApiResponse<void>>(`/enrollments/${id}`),
};

// ─── Admin API ───────────────────────────────────────────────────────
export const adminApi = {
  getDashboard: () =>
    api.get<ApiResponse<AdminDashboardData>>('/admin/dashboard'),

  getUsers: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ users: User[]; pagination: unknown }>>('/admin/users', { params }),

  createUser: (data: Record<string, unknown>) =>
    api.post<ApiResponse<{ user: User }>>('/admin/users', data),

  updateUser: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<{ user: User }>>(`/admin/users/${id}`, data),

  updateUserStatus: (id: string, isActive: boolean) =>
    api.patch<ApiResponse<{ user: User }>>(`/admin/users/${id}/status`, { isActive }),

  resetUserPassword: (id: string, newPassword: string) =>
    api.post<ApiResponse<void>>(`/admin/users/${id}/reset-password`, { newPassword }),

  deleteUser: (id: string) =>
    api.delete<ApiResponse<void>>(`/admin/users/${id}`),

  getSettings: () =>
    api.get<ApiResponse<{ settings: unknown[] }>>('/admin/settings'),

  updateSetting: (data: Record<string, unknown>) =>
    api.put<ApiResponse<unknown>>('/admin/settings', data),

  getAttendanceAnalytics: (params?: Record<string, string>) =>
    api.get<ApiResponse<unknown>>('/admin/analytics/attendance', { params }),

  getAuditLogs: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ logs: AuditLog[]; pagination: unknown }>>('/admin/audit-logs', { params }),

  getSubjects: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ subjects: Subject[]; total: number }>>('/admin/subjects', { params }),

  createSubject: (data: Record<string, unknown>) =>
    api.post<ApiResponse<{ subject: Subject }>>('/admin/subjects', data),

  updateSubject: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<{ subject: Subject }>>(`/admin/subjects/${id}`, data),
};

// ─── Timetable API ──────────────────────────────────────────────────
export const timetableApi = {
  getTimetable: (params?: Record<string, string | number>) =>
    api.get<ApiResponse<{ entries: TimetableEntry[] }>>('/timetable', { params }),

  getTodaysTimetable: () =>
    api.get<ApiResponse<{ entries: TimetableEntry[]; freePeriods: FreePeriod[] }>>('/timetable/today'),

  createTimetable: (data: Record<string, unknown>) =>
    api.post<ApiResponse<{ entry: TimetableEntry }>>('/timetable', data),

  updateTimetable: (id: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<{ entry: TimetableEntry }>>(`/timetable/${id}`, data),

  deleteTimetable: (id: string) =>
    api.delete<ApiResponse<void>>(`/timetable/${id}`),

  getSubjects: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ subjects: Subject[] }>>('/timetable/subjects', { params }),

  createSubject: (data: Record<string, unknown>) =>
    api.post<ApiResponse<{ subject: Subject }>>('/timetable/subjects', data),
};

// ─── Gemini API ─────────────────────────────────────────────────────
export const geminiApi = {
  getStudyPlan: (freePeriodDuration?: number) =>
    api.post<ApiResponse<{ plan: string; historyId: string }>>('/gemini/study-plan', { freePeriodDuration }),

  chat: (message: string) =>
    api.post<ApiResponse<{ response: string }>>('/gemini/chat', { message }),

  getActivityRecommendations: (freePeriodMinutes?: number) =>
    api.post<ApiResponse<{ recommendations: string }>>('/gemini/activity-recommendations', { freePeriodMinutes }),

  getRevisionTopics: (subject: string) =>
    api.get<ApiResponse<{ topics: string }>>(`/gemini/revision/${subject}`),

  getQuiz: (subject: string, numQuestions?: number) =>
    api.get<ApiResponse<{ quiz: string }>>(`/gemini/quiz/${subject}`, { params: numQuestions ? { numQuestions } : undefined }),

  getHistory: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ items: GeminiHistoryItem[]; pagination: unknown }>>('/gemini/history', { params }),
};

// ─── Notification API ───────────────────────────────────────────────
export const notificationApi = {
  getNotifications: (params?: Record<string, string>) =>
    api.get<ApiResponse<{ notifications: Notification[]; unreadCount: number; pagination: unknown }>>('/notifications', { params }),

  markAsRead: (notificationIds?: string[]) =>
    api.patch<ApiResponse<void>>('/notifications/read', { notificationIds }),

  deleteNotification: (id: string) =>
    api.delete<ApiResponse<void>>(`/notifications/${id}`),
};

// ─── Report API ─────────────────────────────────────────────────────
export const reportApi = {
  downloadPDF: (params: Record<string, string>) =>
    api.get('/reports/pdf', { params, responseType: 'blob' }),

  downloadCSV: (params: Record<string, string>) =>
    api.get('/reports/csv', { params, responseType: 'blob' }),
};

// ─── Upload API (Cloudinary) ─────────────────────────────────────────
export const uploadApi = {
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post<ApiResponse<{ url: string; publicId: string; format: string }>>('/upload/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadImage: (file: File, folder?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (folder) formData.append('folder', folder);
    return api.post<ApiResponse<{ url: string; publicId: string; format: string }>>('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

