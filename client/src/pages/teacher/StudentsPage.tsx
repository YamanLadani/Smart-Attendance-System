import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { teacherApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Search,
  BookOpen,
  TrendingUp,
  TrendingDown,
  UserCheck,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { motion } from 'framer-motion';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function StudentsPage() {
  const [searchParams] = useSearchParams();
  const subjectId = searchParams.get('subjectId') || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(subjectId);

  // 1. Fetch dashboard to get teacher's subjects
  const { data: dashData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => teacherApi.getDashboard().then((r) => r.data.data),
  });

  // 2. Fetch all department students (default view)
  const { data: classStudentsData, isLoading: classLoading } = useQuery({
    queryKey: ['class-students'],
    queryFn: () => teacherApi.getClassStudents().then((r) => r.data.data),
  });

  // 3. Fetch students by subject (when subject tab selected)
  const { data: subjectData, isLoading: subjectLoading } = useQuery({
    queryKey: ['subject-students', selectedSubject],
    queryFn: () => teacherApi.getStudentsBySubject(selectedSubject).then((r) => r.data.data),
    enabled: !!selectedSubject,
  });

  const isLoading = selectedSubject ? subjectLoading : classLoading;
  const rawStudents = selectedSubject ? (subjectData?.students || []) : (classStudentsData?.students || []);

  const filteredStudents = rawStudents.filter((s: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (s.studentName || s.displayName || '').toLowerCase();
    const roll = (s.studentRollNumber || s.rollNumber || '').toLowerCase();
    const email = (s.studentEmail || s.email || '').toLowerCase();
    const dept = (s.studentDepartment || s.department || '').toLowerCase();
    return name.includes(q) || roll.includes(q) || email.includes(q) || dept.includes(q);
  });

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Student Roster</h2>
            <p className="text-sm text-muted-foreground">
              {selectedSubject && subjectData?.subject
                ? `${subjectData.subject.name} (${subjectData.subject.code}) — Semester ${subjectData.subject.semester}`
                : 'All enrolled students across your department'}
            </p>
          </div>
        </div>

        <Badge variant="outline" className="px-3 py-1.5 rounded-xl text-xs font-semibold self-start sm:self-auto bg-card">
          <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-primary" />
          {filteredStudents.length} Students Listed
        </Badge>
      </motion.div>

      {/* Subject Filter Tabs */}
      {dashData?.subjects && dashData.subjects.length > 0 && (
        <motion.div variants={item}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSubject('')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                !selectedSubject
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
            >
              All Students ({classStudentsData?.students?.length || 0})
            </button>
            {dashData.subjects.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubject(s.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  selectedSubject === s.id
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md'
                    : 'bg-secondary text-muted-foreground hover:bg-accent'
                }`}
              >
                {s.code} - {s.name} <span className="opacity-70 text-[10px]">Sem {s.semester}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Search Input */}
      <motion.div variants={item}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, roll number, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 rounded-xl border-0 bg-secondary/50 text-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </motion.div>

      {/* Stats Cards (Subject View) */}
      {selectedSubject && subjectData && (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">{subjectData.totalStudents}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Enrolled</p>
            </CardContent>
          </Card>
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {filteredStudents.filter((s: any) => s.attendancePercentage >= 75).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Above 75%</p>
            </CardContent>
          </Card>
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-amber-500/5 to-orange-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                {filteredStudents.filter((s: any) => s.attendancePercentage >= 50 && s.attendancePercentage < 75).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">50-75%</p>
            </CardContent>
          </Card>
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-red-500/5 to-rose-500/5">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">
                {filteredStudents.filter((s: any) => s.attendancePercentage < 50).length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Below 50%</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Student List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : filteredStudents.length > 0 ? (
        <motion.div variants={item}>
          <Card className="border-0 rounded-2xl shadow-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredStudents.map((student: any, idx: number) => {
                  const name = student.studentName || student.displayName || 'Student';
                  const roll = student.studentRollNumber || student.rollNumber || '-';
                  const email = student.studentEmail || student.email || '';
                  const dept = student.studentDepartment || student.department || 'Computer Science';
                  const sem = student.studentSemester || student.semester || 5;
                  const div = student.studentDivision || student.division || 'A';
                  const percentage = student.attendancePercentage;
                  const hasAttendance = percentage !== undefined;

                  return (
                    <div
                      key={student.studentId || student.id || idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-accent/30 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            Roll No: <strong className="text-foreground">{roll}</strong> • {email}
                          </p>
                          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                            {dept} • Semester {sem} {div ? `(Div ${div})` : ''}
                          </p>
                        </div>
                      </div>

                      {hasAttendance ? (
                        <div className="flex items-center gap-3 sm:self-center">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              Present: <strong className="text-foreground">{student.presentCount}</strong> / {student.totalClasses}
                            </p>
                          </div>
                          <Badge
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold border-0 min-w-[70px] justify-center ${
                              percentage >= 75
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : percentage >= 50
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {percentage >= 75 ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : percentage < 50 ? (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {percentage}%
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-medium">
                            {dept} • Sem {sem}
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <Card className="border-0 rounded-2xl shadow-lg">
            <CardContent className="py-16 text-center">
              <UserCheck className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No students match your query</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? `No students found matching "${searchQuery}"` : 'No registered students in your department yet.'}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
