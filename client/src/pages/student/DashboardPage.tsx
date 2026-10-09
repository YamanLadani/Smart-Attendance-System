import { useQuery } from '@tanstack/react-query';
import { studentApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3, CalendarDays, Target, ScanLine, TrendingUp, Clock,
  BookOpen, Zap, ChevronRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => studentApi.getDashboard().then((r) => r.data.data),
  });
  const firstName = user?.displayName?.split(' ')[0] || 'Student';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const attendancePct = data?.attendance?.percentage ?? 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-7">
      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">
          Hello 👋 <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{firstName}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d')} — Track your attendance and goals
        </p>
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Attendance Card */}
        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Overall Attendance</p>
                  <p className="text-4xl font-extrabold mt-1">{attendancePct}%</p>
                  <p className="text-blue-200 text-xs mt-2">
                    {data?.attendance?.present || 0} of {data?.attendance?.total || 0} classes
                  </p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <TrendingUp className="w-7 h-7" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-blue-200 mb-1.5">
                  <span>Progress</span>
                  <span>{attendancePct}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${attendancePct}%` }}
                  />
                </div>
              </div>
              {/* Decorative circle */}
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/[0.07]" />
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/[0.07]" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Goals */}
        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Active Goals</p>
                  <p className="text-4xl font-extrabold mt-1">{data?.activeGoals?.length || 0}</p>
                  <p className="text-emerald-200 text-xs mt-2">Keep pushing forward!</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Target className="w-7 h-7" />
                </div>
              </div>
              <Link to="/student/goals" className="mt-4 flex items-center gap-1 text-sm text-white/80 hover:text-white transition-colors">
                View all goals <ChevronRight className="w-4 h-4" />
              </Link>
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/[0.07]" />
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/[0.07]" />
            </CardContent>
          </Card>
        </motion.div>

        {/* Semester Info */}
        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-violet-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-violet-100 text-sm font-medium">Current Semester</p>
                  <p className="text-4xl font-extrabold mt-1">{data?.student?.semester || '-'}</p>
                  <p className="text-violet-200 text-xs mt-2">{data?.student?.branch || 'N/A'} • {data?.student?.division || '-'} Div</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <BookOpen className="w-7 h-7" />
                </div>
              </div>
              <p className="mt-4 text-sm text-white/80">
                Roll No: {data?.student?.rollNumber || '-'}
              </p>
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/[0.07]" />
              <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/[0.07]" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Quick Actions ── */}
      <motion.div variants={item}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: '/student/scan', icon: ScanLine, label: 'Scan QR', desc: 'Mark attendance', gradient: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-500/20' },
            { to: '/student/attendance', icon: BarChart3, label: 'Attendance', desc: 'View stats', gradient: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-500/20' },
            { to: '/student/timetable', icon: CalendarDays, label: 'Timetable', desc: 'Today\'s classes', gradient: 'from-violet-500 to-purple-400', shadow: 'shadow-violet-500/20' },
            { to: '/student/goals', icon: Target, label: 'Goals', desc: 'Track progress', gradient: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/20' },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.to} to={action.to}>
                <Card className="border-0 rounded-2xl shadow-lg card-hover cursor-pointer group">
                  <CardContent className="p-5 flex flex-col items-center gap-3 text-center">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg ${action.shadow} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* ── Recent Attendance ── */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Attendance</h3>
          <Link to="/student/attendance" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-0">
            {data?.recentAttendance && data.recentAttendance.length > 0 ? (
              <div className="divide-y divide-border">
                {data.recentAttendance.map((record, index) => (
                  <div key={record.id} className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary">
                        <span className="text-xs font-bold text-muted-foreground">
                          {format(new Date(record.date), 'dd')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{record.subjectName || 'Unknown Subject'}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.subjectCode} • {format(new Date(record.date), 'MMM yyyy')}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={`rounded-lg px-3 py-1 text-xs font-semibold border-0 ${
                        record.status === 'present'
                          ? 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20'
                          : record.status === 'late'
                          ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20'
                          : 'bg-red-500/10 text-red-500 dark:bg-red-500/20'
                      }`}
                    >
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                  <Clock className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">No attendance records yet</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Scan a QR code to mark your first attendance</p>
                <Link to="/student/scan" className="mt-4">
                  <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
                    <ScanLine className="w-4 h-4" /> Scan QR Code
                  </button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
