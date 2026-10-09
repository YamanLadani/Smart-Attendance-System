import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentApi, timetableApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  CheckCircle2,
  PlusCircle,
  Search,
  Loader2,
  GraduationCap,
  Sparkles,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import type { Subject, Enrollment } from '@/types';

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const studentSemester = user?.semester || 1;

  // 1. Fetch student's currently enrolled subjects
  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['student-enrolled-courses'],
    queryFn: async () => {
      const res = await enrollmentApi.getStudentEnrollments();
      return res.data.data?.enrollments || [];
    },
  });

  // 2. Fetch available subjects locked strictly to the student's registered semester
  const { data: allSubjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['available-subjects', studentSemester],
    queryFn: async () => {
      const res = await timetableApi.getSubjects({ semester: String(studentSemester) });
      return res.data.data?.subjects || [];
    },
  });

  // Enroll mutation
  const enrollMutation = useMutation({
    mutationFn: (subjectId: string) =>
      enrollmentApi.enroll({
        studentId: user?.id || '',
        subjectId,
      }),
    onSuccess: () => {
      toast.success('Enrolled in course successfully! 🎉');
      queryClient.invalidateQueries({ queryKey: ['student-enrolled-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to enroll in course');
    },
  });

  const enrolledSubjectIds = new Set((enrollmentsData || []).map((e: Enrollment) => e.subjectId));

  // Strict semester isolation: filter out any subjects not belonging to student's semester
  const filteredAvailable = (allSubjects || []).filter((s: Subject) => {
    const isMatchingSem = s.semester === studentSemester;
    const matchesSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    return isMatchingSem && matchesSearch;
  });

  const typeColor = (t: string) => {
    const map: Record<string, string> = {
      core: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      elective: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      university_elective: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      audit_course: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      project: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      skill_augmentation: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
    };
    return map[t] || 'bg-secondary text-muted-foreground';
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      core: 'Core',
      elective: 'Elective',
      university_elective: 'University Elective',
      audit_course: 'Audit Course',
      project: 'Project',
      internship: 'Internship',
      skill_augmentation: 'Skill Augmentation',
    };
    return map[t] || t;
  };

  const totalCredits = (enrollmentsData || []).reduce(
    (acc: number, curr: any) => acc + (curr.credits || 0),
    0
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Course Registration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and enroll in official Semester {studentSemester} curriculum courses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 bg-card border text-xs font-semibold">
            <GraduationCap className="w-3.5 h-3.5 mr-1.5 text-primary" />
            {(enrollmentsData || []).length} Enrolled Courses
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5 bg-card border text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
            {totalCredits} Total Credits
          </Badge>
        </div>
      </div>

      {/* ─── SECTION 1: MY ENROLLED COURSES ─── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" /> My Enrolled Courses ({(enrollmentsData || []).length})
        </h2>

        {enrollmentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (enrollmentsData || []).length === 0 ? (
          <Card className="border shadow-sm bg-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-base font-semibold">No courses enrolled yet</p>
              <p className="text-xs mt-1">
                Browse your Semester {studentSemester} subjects below and click &quot;Enroll&quot; to register.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(enrollmentsData || []).map((course: any, idx: number) => (
              <motion.div
                key={course.enrollmentId || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className="border rounded-2xl shadow-md hover:shadow-lg transition-all bg-card overflow-hidden h-full flex flex-col justify-between">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge className="font-mono text-xs font-bold bg-primary/10 text-primary border-0">
                        {course.subjectCode}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] capitalize ${typeColor(course.subjectType)}`}>
                        {typeLabel(course.subjectType)}
                      </Badge>
                    </div>

                    <h3 className="font-bold text-sm text-foreground mb-1 line-clamp-2">
                      {course.subjectName}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {course.subjectDepartment} • Semester {course.subjectSemester}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3 mt-auto">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        {course.credits || 0} Credits
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Enrolled
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ─── SECTION 2: BROWSE & ENROLL IN SEMESTER-SPECIFIC SUBJECTS ─── */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" /> Available Semester {studentSemester} Courses
            </h2>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] font-semibold gap-1">
              <ShieldCheck className="w-3 h-3" /> Semester {studentSemester} Locked
            </Badge>
          </div>

          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {subjectsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredAvailable.length === 0 ? (
          <Card className="border shadow-sm bg-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No courses matching your search for Semester {studentSemester}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAvailable.map((subject: Subject, idx: number) => {
              const isEnrolled = enrolledSubjectIds.has(subject.id);

              return (
                <motion.div
                  key={subject.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                >
                  <Card className="border rounded-2xl shadow-md hover:shadow-lg transition-all bg-card overflow-hidden h-full flex flex-col justify-between">
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <Badge className="font-mono text-xs font-bold bg-primary/10 text-primary border-0">
                          {subject.code}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] capitalize ${typeColor(subject.type)}`}>
                          {typeLabel(subject.type)}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-sm text-foreground mb-1 line-clamp-2">
                        {subject.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {subject.department} • Semester {subject.semester} • {subject.credits} Credits
                      </p>

                      <div className="pt-3 mt-auto border-t flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">
                          {subject.teachingHours ? `${subject.teachingHours} hrs/wk` : ''}
                        </span>

                        {isEnrolled ? (
                          <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Enrolled
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => enrollMutation.mutate(subject.id)}
                            disabled={enrollMutation.isPending}
                            className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-xs h-8 px-3 font-semibold"
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1" /> Enroll
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
