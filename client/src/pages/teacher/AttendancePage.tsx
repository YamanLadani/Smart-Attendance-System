import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableApi, enrollmentApi, attendanceApi } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarCheck,
  UserCheck,
  UserX,
  Clock,
  Save,
  CheckCheck,
  BookOpen,
  Loader2,
  Users,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

export default function TeacherAttendancePage() {
  const queryClient = useQueryClient();
  const [selectedSubject, setSelectedSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lectureTitle, setLectureTitle] = useState('Lecture 1');
  const [studentStatus, setStudentStatus] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch teacher's subjects
  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => timetableApi.getSubjects().then((r) => r.data.data?.subjects || []),
  });

  // Fetch enrolled students for selected subject
  const { data: enrollmentData, isLoading: studentsLoading } = useQuery({
    queryKey: ['enrolled-students-manual', selectedSubject],
    queryFn: async () => {
      if (!selectedSubject) return null;
      const res = await enrollmentApi.getEnrolledStudents(selectedSubject);
      return res.data.data;
    },
    enabled: !!selectedSubject,
  });

  const students = enrollmentData?.students || [];

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late') => {
    setStudentStatus((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const markAllPresent = () => {
    const nextStatus: Record<string, 'present' | 'absent' | 'late'> = {};
    students.forEach((s) => {
      nextStatus[s.studentId] = 'present';
    });
    setStudentStatus(nextStatus);
    toast.info('All students marked as Present');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }
    if (students.length === 0) {
      toast.error('No students enrolled in this subject');
      return;
    }

    try {
      setIsSubmitting(true);
      const lectureId = `MANUAL-${selectedSubject}-${date}-${Date.now().toString().slice(-4)}`;

      // Save each student's attendance
      const promises = students.map((s) => {
        const status = studentStatus[s.studentId] || 'absent';
        return attendanceApi.manualMark({
          studentId: s.studentId,
          subjectId: selectedSubject,
          lectureId,
          status,
          remarks: `Manual attendance recorded for ${lectureTitle} on ${date}`,
        });
      });

      await Promise.all(promises);

      toast.success(`Manual attendance recorded for ${students.length} students! ✅`);
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['subject-students'] });
      setStudentStatus({});
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit manual attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Manual Attendance Entry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Take direct roll call and record attendance manually without QR codes
        </p>
      </div>

      {/* Control Configuration Card */}
      <Card className="border shadow-lg bg-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Subject *</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code}) — Sem {s.semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Attendance Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Lecture Title / Topic</Label>
              <Input
                placeholder="e.g. Unit 3 - Classification"
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
                className="bg-background"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enrolled Students Attendance Form */}
      {selectedSubject && (
        <Card className="border shadow-lg bg-card">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Enrolled Students ({students.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Select Present, Absent, or Late for each student
              </CardDescription>
            </div>

            {students.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllPresent}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
              >
                <CheckCheck className="w-4 h-4 mr-1" /> Mark All Present
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-6">
            {studentsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-semibold">No students enrolled in this subject</p>
                <p className="text-xs mt-1">Enroll students via Admin panel or registration</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="divide-y divide-border border rounded-xl overflow-hidden">
                  {students.map((student, idx) => {
                    const currentStatus = studentStatus[student.studentId] || 'absent';

                    return (
                      <div
                        key={student.studentId || idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-secondary/30 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center font-bold text-primary text-xs">
                            {student.studentName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{student.studentName}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.studentRollNumber || 'No Roll No'} • {student.studentEmail}
                            </p>
                          </div>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === 'present' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(student.studentId, 'present')}
                            className={`h-8 text-xs font-semibold ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'text-muted-foreground hover:text-emerald-600'
                            }`}
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" /> Present
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === 'late' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(student.studentId, 'late')}
                            className={`h-8 text-xs font-semibold ${
                              currentStatus === 'late'
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'text-muted-foreground hover:text-amber-600'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5 mr-1" /> Late
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant={currentStatus === 'absent' ? 'default' : 'outline'}
                            onClick={() => handleStatusChange(student.studentId, 'absent')}
                            className={`h-8 text-xs font-semibold ${
                              currentStatus === 'absent'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'text-muted-foreground hover:text-red-600'
                            }`}
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" /> Absent
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/20 py-5 px-6 font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Attendance...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" /> Submit Manual Attendance
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
