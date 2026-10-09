import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ScanLine,
  CalendarDays,
  BarChart3,
  QrCode,
  Users,
  Settings,
  BookOpen,
  Target,
  LogOut,
  GraduationCap,
  Bot,
  FileText,
  ClipboardList,
  ShieldCheck,
  BookOpenCheck,
  User as UserIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const studentLinks = [
  { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/student/courses', label: 'Courses', icon: BookOpen },
  { to: '/student/scan', label: 'Scan QR', icon: ScanLine },
  { to: '/student/attendance', label: 'Attendance', icon: BarChart3 },
  { to: '/student/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/student/goals', label: 'Goals', icon: Target },
  { to: '/student/ai-assistant', label: 'AI Study Buddy', icon: Bot },
  { to: '/student/notes', label: 'Notes & Material', icon: BookOpen },
  { to: '/student/reports', label: 'Reports', icon: FileText },
  { to: '/student/profile', label: 'Profile', icon: UserIcon },
];

const teacherLinks = [
  { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teacher/generate-qr', label: 'Generate QR', icon: QrCode },
  { to: '/teacher/attendance', label: 'Attendance', icon: BarChart3 },
  { to: '/teacher/students', label: 'Students', icon: Users },
  { to: '/teacher/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/teacher/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/teacher/reports', label: 'Reports', icon: FileText },
  { to: '/teacher/notes', label: 'Notes', icon: BookOpen },
  { to: '/teacher/profile', label: 'Profile', icon: UserIcon },
];

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/subjects', label: 'Subjects', icon: BookOpenCheck },
  { to: '/admin/timetable', label: 'Timetable', icon: CalendarDays },
  { to: '/admin/enrollments', label: 'Enrollments', icon: ClipboardList },
  { to: '/admin/attendance', label: 'Attendance', icon: BarChart3 },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/profile', label: 'Profile', icon: UserIcon },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links =
    user?.role === 'teacher' ? teacherLinks :
    user?.role === 'admin' ? adminLinks :
    studentLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[260px] flex flex-col bg-[#0a0e1a] border-r border-white/[0.06]">
      {/* ── Logo Section ── */}
      <div className="flex items-center gap-3 px-5 h-[72px] border-b border-white/[0.06]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-[15px] font-bold text-white tracking-tight">Smart Attendance</h1>
          <p className="text-[11px] text-white/40 font-medium">System</p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto no-scrollbar">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Menu
        </p>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200',
                  isActive
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active background glow */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/15 to-cyan-500/10 border border-blue-500/20" />
                  )}

                  {/* Hover background */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/[0.04] transition-colors duration-200" />
                  )}

                  {/* Icon */}
                  <div
                    className={cn(
                      'relative z-10 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-400 shadow-md shadow-blue-500/25'
                        : 'bg-white/[0.06] group-hover:bg-white/[0.1]'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] transition-colors duration-200',
                        isActive ? 'text-white' : 'text-white/60 group-hover:text-white/80'
                      )}
                    />
                  </div>

                  {/* Label */}
                  <span className="relative z-10">{link.label}</span>

                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── User Section ── */}
      <div className="border-t border-white/[0.06] p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10 ring-2 ring-white/10">
            <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-cyan-400/20 text-white text-sm font-semibold">
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.displayName || 'User'}</p>
            <p className="text-[11px] text-white/40 capitalize">{user?.role || 'student'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
