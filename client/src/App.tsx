import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Auth Pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

// Student Pages
import StudentDashboard from '@/pages/student/DashboardPage';
import StudentCoursesPage from '@/pages/student/CoursesPage';
import ScanQRPage from '@/pages/student/ScanQRPage';
import AttendancePage from '@/pages/student/AttendancePage';
import TimetablePage from '@/pages/student/TimetablePage';
import GoalsPage from '@/pages/student/GoalsPage';
import AIAssistantPage from '@/pages/student/AIAssistantPage';
import StudentReportsPage from '@/pages/student/ReportsPage';
import StudentNotesPage from '@/pages/student/NotesPage';

// Teacher Pages
import TeacherDashboard from '@/pages/teacher/DashboardPage';
import GenerateQRPage from '@/pages/teacher/GenerateQRPage';
import TeacherAttendancePage from '@/pages/teacher/AttendancePage';
import AnalyticsPage from '@/pages/teacher/AnalyticsPage';
import NotesPage from '@/pages/teacher/NotesPage';
import TeacherStudentsPage from '@/pages/teacher/StudentsPage';
import TeacherTimetablePage from '@/pages/teacher/TimetablePage';
import TeacherReportsPage from '@/pages/teacher/ReportsPage';

// Admin Pages
import AdminDashboard from '@/pages/admin/DashboardPage';
import UsersPage from '@/pages/admin/UsersPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import SubjectsPage from '@/pages/admin/SubjectsPage';
import AdminTimetablePage from '@/pages/admin/TimetablePage';
import EnrollmentsPage from '@/pages/admin/EnrollmentsPage';
import AdminAttendancePage from '@/pages/admin/AttendancePage';
import AuditLogsPage from '@/pages/admin/AuditLogsPage';

// Shared Profile Page
import ProfilePage from '@/pages/shared/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Student Routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['student']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/courses" element={<StudentCoursesPage />} />
                <Route path="/student/scan" element={<ScanQRPage />} />
                <Route path="/student/attendance" element={<AttendancePage />} />
                <Route path="/student/timetable" element={<TimetablePage />} />
                <Route path="/student/goals" element={<GoalsPage />} />
                <Route path="/student/ai-assistant" element={<AIAssistantPage />} />
                <Route path="/student/reports" element={<StudentReportsPage />} />
                <Route path="/student/notes" element={<StudentNotesPage />} />
                <Route path="/student/profile" element={<ProfilePage />} />
              </Route>

              {/* Teacher Routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['teacher']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                <Route path="/teacher/generate-qr" element={<GenerateQRPage />} />
                <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />
                <Route path="/teacher/students" element={<TeacherStudentsPage />} />
                <Route path="/teacher/timetable" element={<TeacherTimetablePage />} />
                <Route path="/teacher/analytics" element={<AnalyticsPage />} />
                <Route path="/teacher/reports" element={<TeacherReportsPage />} />
                <Route path="/teacher/notes" element={<NotesPage />} />
                <Route path="/teacher/profile" element={<ProfilePage />} />
              </Route>

              {/* Admin Routes */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/subjects" element={<SubjectsPage />} />
                <Route path="/admin/timetable" element={<AdminTimetablePage />} />
                <Route path="/admin/enrollments" element={<EnrollmentsPage />} />
                <Route path="/admin/attendance" element={<AdminAttendancePage />} />
                <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/profile" element={<ProfilePage />} />
              </Route>

              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>

          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
