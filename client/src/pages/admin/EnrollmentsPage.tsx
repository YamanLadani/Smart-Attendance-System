import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { enrollmentApi, adminApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ClipboardList, Search, UserPlus, Trash2, Loader2, Users, BookOpen } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import type { Subject, Enrollment } from '@/types';

export default function EnrollmentsPage() {
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');

  // Get all subjects for dropdown
  const { data: subjectsData } = useQuery({
    queryKey: ['admin-subjects-list'],
    queryFn: async () => {
      const res = await adminApi.getSubjects();
      return res.data.data?.subjects || [];
    },
  });

  // Get enrolled students for selected subject
  const { data: enrollmentData, isLoading } = useQuery({
    queryKey: ['enrolled-students', selectedSubject],
    queryFn: async () => {
      if (!selectedSubject) return null;
      const res = await enrollmentApi.getEnrolledStudents(selectedSubject);
      return res.data.data;
    },
    enabled: !!selectedSubject,
  });

  // Get all students for enrollment modal
  const { data: allUsers } = useQuery({
    queryKey: ['admin-users-students'],
    queryFn: async () => {
      const res = await adminApi.getUsers({ role: 'student', limit: '200' });
      return res.data.data?.users || [];
    },
    enabled: showEnroll,
  });

  const enrollMutation = useMutation({
    mutationFn: (data: { studentId: string; subjectId: string }) => enrollmentApi.enroll(data),
    onSuccess: () => {
      toast.success('Student enrolled!');
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
      setEnrollStudentId('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Enrollment failed'),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => enrollmentApi.remove(id),
    onSuccess: () => {
      toast.success('Enrollment removed');
      queryClient.invalidateQueries({ queryKey: ['enrolled-students'] });
    },
    onError: () => toast.error('Failed to remove enrollment'),
  });

  const students = enrollmentData?.students || [];
  const filtered = students.filter((s: Enrollment) =>
    !search || s.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    s.studentRollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    s.studentEmail?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Enrollments</h1>
          <p className="text-sm text-white/50 mt-1">Manage student-subject enrollments</p>
        </div>
      </div>

      {/* Subject Selector */}
      <Card className="bg-white/[0.03] border-white/[0.06]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[250px]">
              <p className="text-xs text-white/40 mb-1.5 font-medium">Select Subject</p>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Choose a subject to manage" />
                </SelectTrigger>
                <SelectContent>
                  {(subjectsData || []).map((s: Subject) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code}) — Sem {s.semester}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSubject && (
              <>
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10 text-white" />
                </div>
                <Button onClick={() => setShowEnroll(true)}
                  className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white">
                  <UserPlus className="w-4 h-4 mr-2" /> Enroll Student
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {selectedSubject && enrollmentData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Enrolled', value: enrollmentData.totalStudents, icon: Users, color: 'from-blue-500 to-cyan-400' },
            { label: 'Subject', value: enrollmentData.subject?.name, icon: BookOpen, color: 'from-purple-500 to-pink-400' },
          ].map((stat, i) => (
            <Card key={i} className="bg-white/[0.03] border-white/[0.06]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/40">{stat.label}</p>
                  <p className="text-lg font-bold text-white">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student List */}
      {!selectedSubject ? (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="text-white/40">Select a subject to view enrolled students</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="text-white/40 mb-4">No students enrolled yet</p>
            <Button onClick={() => setShowEnroll(true)} variant="outline" className="border-white/10 text-white/70">
              <UserPlus className="w-4 h-4 mr-2" /> Enroll Students
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="py-3 px-4 text-xs text-white/40 font-medium">#</th>
                <th className="py-3 px-4 text-xs text-white/40 font-medium">Student</th>
                <th className="py-3 px-4 text-xs text-white/40 font-medium">Roll No.</th>
                <th className="py-3 px-4 text-xs text-white/40 font-medium">Attendance</th>
                <th className="py-3 px-4 text-xs text-white/40 font-medium">%</th>
                <th className="py-3 px-4 text-xs text-white/40 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: Enrollment, i: number) => (
                <motion.tr key={s.enrollmentId || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="py-3 px-4 text-xs text-white/40">{i + 1}</td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-white font-medium">{s.studentName}</p>
                    <p className="text-xs text-white/40">{s.studentEmail}</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-white/60">{s.studentRollNumber || '—'}</td>
                  <td className="py-3 px-4 text-sm text-white/60">{s.presentCount || 0}/{s.totalClasses || 0}</td>
                  <td className="py-3 px-4">
                    <Badge variant="outline" className={
                      (s.attendancePercentage || 0) >= 75 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      (s.attendancePercentage || 0) >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }>
                      {s.attendancePercentage || 0}%
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(s.enrollmentId)}
                      className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Enroll Dialog */}
      <Dialog open={showEnroll} onOpenChange={setShowEnroll}>
        <DialogContent className="bg-[#0f1420] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Enroll Student</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-xs text-white/40 mb-2">Select a student to enroll</p>
            <Select value={enrollStudentId} onValueChange={setEnrollStudentId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Choose student" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {(allUsers || []).map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.displayName} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEnroll(false)} className="border-white/10 text-white/70">Cancel</Button>
            <Button onClick={() => { if (enrollStudentId && selectedSubject) enrollMutation.mutate({ studentId: enrollStudentId, subjectId: selectedSubject }); }}
              disabled={!enrollStudentId || enrollMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
              {enrollMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
