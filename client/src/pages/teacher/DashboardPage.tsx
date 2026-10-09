import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teacherApi, enrollmentApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, BookOpen, CalendarDays, QrCode, BarChart3, Clock, FileText, GraduationCap, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import type { Enrollment } from '@/types';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => teacherApi.getDashboard().then((r) => r.data.data),
  });

  // Fetch enrolled students for expanded subject
  const { data: enrolledData, isLoading: enrolledLoading } = useQuery({
    queryKey: ['enrolled-students', expandedSubject],
    queryFn: () => enrollmentApi.getEnrolledStudents(expandedSubject!).then(r => r.data.data),
    enabled: !!expandedSubject,
  });

  const firstName = user?.displayName?.split(' ')[0] || 'Teacher';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-7">
      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">
          Hello 👋 <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{firstName}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d')} — Here's your dashboard overview
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Today's Attendance</p>
                  <p className="text-4xl font-extrabold mt-1">{data?.todayAttendanceCount ?? 0}</p>
                  <p className="text-emerald-200 text-xs mt-2">Students marked today</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <CalendarDays className="w-7 h-7" />
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/[0.07]" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-0 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">My Subjects</p>
                  <p className="text-4xl font-extrabold mt-1">{data?.subjectCount ?? 0}</p>
                  <p className="text-blue-200 text-xs mt-2">Active subjects</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <BookOpen className="w-7 h-7" />
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/[0.07]" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="relative overflow-hidden border-0 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-xl shadow-violet-500/20">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-violet-100 text-sm font-medium">Total Students</p>
                  <p className="text-4xl font-extrabold mt-1">{data?.totalStudents ?? 0}</p>
                  <p className="text-violet-200 text-xs mt-2">Enrolled across subjects</p>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Users className="w-7 h-7" />
                </div>
              </div>
              <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/[0.07]" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* My Subjects with expandable student list */}
      {data?.subjects && data.subjects.length > 0 && (
        <motion.div variants={item}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> My Subjects
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.subjects.map((subject: any, idx: number) => {
              const colors = ['from-blue-500/10 to-cyan-500/10 border-blue-500/20', 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20', 'from-violet-500/10 to-purple-500/10 border-violet-500/20', 'from-amber-500/10 to-orange-500/10 border-amber-500/20'];
              const textColors = ['text-blue-600 dark:text-blue-400', 'text-emerald-600 dark:text-emerald-400', 'text-violet-600 dark:text-violet-400', 'text-amber-600 dark:text-amber-400'];
              const color = colors[idx % colors.length];
              const textColor = textColors[idx % textColors.length];
              const isExpanded = expandedSubject === subject.id;

              return (
                <div key={subject.id}>
                  <Card className={`border rounded-2xl bg-gradient-to-br ${color} shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={`${textColor} bg-white/60 dark:bg-white/10 border-0 font-mono text-xs`}>{subject.code}</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{subject.type}</Badge>
                      </div>
                      <Link to={`/teacher/students?subjectId=${subject.id}&subjectName=${encodeURIComponent(subject.name)}`}>
                        <h4 className="font-semibold text-base mb-1 hover:underline">{subject.name}</h4>
                      </Link>
                      <p className="text-xs text-muted-foreground mb-3">{subject.department} • Sem {subject.semester} • {subject.credits} credits</p>

                      {/* Expand/Collapse for student list */}
                      <button
                        onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{subject.studentCount || 0} students enrolled</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-auto" /> : <ChevronDown className="w-3.5 h-3.5 ml-auto" />}
                      </button>
                    </CardContent>

                    {/* Expanded student list */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-white/10 dark:border-white/5 px-5 py-3 max-h-[240px] overflow-y-auto">
                            {enrolledLoading ? (
                              <div className="space-y-2">
                                {[1,2,3].map(i => <Skeleton key={i} className="h-8 rounded-lg" />)}
                              </div>
                            ) : enrolledData?.students?.length ? (
                              <div className="space-y-1.5">
                                {(enrolledData.students as Enrollment[]).map((student, si) => (
                                  <div key={student.studentId || si} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/30 dark:hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                        {student.studentName?.charAt(0)?.toUpperCase() || '?'}
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium">{student.studentName}</p>
                                        <p className="text-[10px] text-muted-foreground">{student.studentRollNumber || student.studentEmail}</p>
                                      </div>
                                    </div>
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                      (student.attendancePercentage || 0) >= 75 ? 'text-emerald-500 border-emerald-500/30' :
                                      (student.attendancePercentage || 0) >= 50 ? 'text-amber-500 border-amber-500/30' :
                                      'text-red-500 border-red-500/30'
                                    }`}>
                                      {student.attendancePercentage || 0}%
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground text-center py-4">No students enrolled yet</p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Today's Schedule */}
      {data?.todaySchedule && data.todaySchedule.length > 0 && (
        <motion.div variants={item}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" /> Today's Schedule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.todaySchedule.map((cls: any) => (
              <Card key={cls.id} className="border-0 rounded-2xl shadow-md">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{cls.subjectName} <span className="text-muted-foreground font-mono text-xs">({cls.subjectCode})</span></p>
                    <p className="text-xs text-muted-foreground">{cls.startTime} – {cls.endTime} • {cls.department} Sem {cls.semester} {cls.division}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{cls.room}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { to: '/teacher/generate-qr', icon: QrCode, label: 'Generate QR', desc: 'Start session', gradient: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-500/20' },
            { to: '/teacher/analytics', icon: BarChart3, label: 'Analytics', desc: 'View insights', gradient: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-500/20' },
            { to: '/teacher/students', icon: Users, label: 'Students', desc: 'View roster', gradient: 'from-violet-500 to-purple-400', shadow: 'shadow-violet-500/20' },
            { to: '/teacher/reports', icon: FileText, label: 'Reports', desc: 'Download reports', gradient: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/20' },
          ].map((action) => (
            <Link key={action.to} to={action.to}>
              <Card className="border-0 rounded-2xl shadow-lg card-hover cursor-pointer group">
                <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg ${action.shadow} group-hover:scale-110 transition-transform duration-300`}>
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Records */}
      <motion.div variants={item}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
          <GraduationCap className="w-4 h-4" /> Recent Attendance Records
        </h3>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-0">
            {data?.recentRecords && data.recentRecords.length > 0 ? (
              <div className="divide-y divide-border">
                {data.recentRecords.slice(0, 10).map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <span className="text-sm font-bold text-muted-foreground">{record.studentName?.charAt(0) || '?'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{record.studentName || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{record.subjectName} • {record.subjectCode}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <Badge className={`rounded-lg px-3 py-1 text-xs font-semibold border-0 ${
                        record.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' : record.status === 'late' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {record.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(record.date), 'dd MMM')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Clock className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-medium">No recent records</p>
                <p className="text-xs text-muted-foreground mt-1">Records will appear when students mark attendance</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
