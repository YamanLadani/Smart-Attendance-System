import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, timetableApi } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  QrCode,
  RefreshCw,
  Clock,
  Copy,
  CheckCircle2,
  Sparkles,
  Users,
  UserCheck,
  UserX,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

export default function GenerateQRPage() {
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState('');
  const [expiryDuration, setExpiryDuration] = useState('15');
  const [autoRotate, setAutoRotate] = useState(true);
  const [qrData, setQrData] = useState<{
    qrDataUrl: string;
    lectureId: string;
    expiresAt: number;
    token: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => timetableApi.getSubjects().then((r) => r.data.data?.subjects || []),
  });

  // Query live session roster every 3 seconds while active
  const { data: sessionRosterData, refetch: refetchRoster } = useQuery({
    queryKey: ['session-roster', qrData?.lectureId],
    queryFn: async () => {
      if (!qrData?.lectureId) return null;
      const res = await attendanceApi.getSessionRoster(qrData.lectureId);
      return res.data.data;
    },
    enabled: !!qrData?.lectureId,
    refetchInterval: qrData?.lectureId ? 3000 : false,
  });

  // Manual mark mutation
  const manualMarkMutation = useMutation({
    mutationFn: (data: { studentId: string; subjectId: string; lectureId: string; status: string }) =>
      attendanceApi.manualMark(data),
    onSuccess: (res, vars) => {
      toast.success(`Marked as ${vars.status}`);
      refetchRoster();
      queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Manual marking failed');
    },
  });

  const generateQR = async () => {
    if (!subjectId) {
      toast.error('Please select a subject');
      return;
    }
    try {
      setIsGenerating(true);
      const seconds = parseInt(expiryDuration, 10) || 15;
      const response = await attendanceApi.generateQR({ subjectId, expirySeconds: seconds });
      if (response.data.data) {
        setQrData(response.data.data);
        toast.success('New dynamic QR generated!');
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || 'Failed to generate QR');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (qrData && qrData.expiresAt) {
      const update = () => {
        const remaining = Math.max(0, Math.floor((qrData.expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Auto-rotate if enabled
          if (autoRotate && subjectId) {
            generateQR();
          }
        }
      };

      update();
      timerRef.current = setInterval(update, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [qrData, autoRotate, subjectId]);

  const copyLectureId = () => {
    if (qrData?.lectureId) {
      navigator.clipboard.writeText(qrData.lectureId);
      toast.success('Lecture ID copied!');
    }
  };

  const roster = sessionRosterData?.roster || [];
  const summary = sessionRosterData?.summary as {
    totalEnrolled: number;
    present: number;
    absent: number;
    pending: number;
  } | undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: QR Generator Card */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 rounded-2xl shadow-xl overflow-hidden glass-card">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <QrCode className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Dynamic QR Attendance</h2>
                  <p className="text-emerald-100 text-xs">Rotating QR with dynamic expiry</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6 space-y-5">
              {/* Subject Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Subject</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="rounded-xl bg-secondary/50">
                    <SelectValue placeholder="Choose a subject" />
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

              {/* QR Expiry Duration & Auto-rotate */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">QR Validity</Label>
                  <Select value={expiryDuration} onValueChange={setExpiryDuration}>
                    <SelectTrigger className="rounded-xl bg-secondary/50">
                      <SelectValue placeholder="Duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 Seconds</SelectItem>
                      <SelectItem value="30">30 Seconds</SelectItem>
                      <SelectItem value="45">45 Seconds</SelectItem>
                      <SelectItem value="60">60 Seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/30 border border-border/40">
                    <Label htmlFor="auto-rotate" className="text-xs cursor-pointer">Auto-rotate QR</Label>
                    <Switch id="auto-rotate" checked={autoRotate} onCheckedChange={setAutoRotate} />
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateQR}
                disabled={isGenerating || !subjectId}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-xl shadow-emerald-500/25 rounded-xl py-5 text-sm font-semibold"
              >
                {isGenerating ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Start Session & Generate QR</>
                )}
              </Button>

              {/* QR Display */}
              {qrData && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4 pt-2">
                  <div className="relative mx-auto w-56 h-56 rounded-2xl overflow-hidden ring-4 ring-emerald-500/20 shadow-2xl bg-white p-2">
                    <img src={qrData.qrDataUrl} alt="Attendance QR Code" className="w-full h-full object-contain" />
                    {timeLeft <= 0 && !autoRotate && (
                      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center text-white">
                          <p className="font-bold text-sm mb-2">QR Code Expired</p>
                          <Button onClick={generateQR} variant="secondary" size="sm" className="rounded-lg text-xs">
                            <RotateCw className="mr-1 h-3.5 w-3.5" /> Rotate QR
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex items-center justify-center gap-2">
                    <Clock className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
                    <span className="text-xs text-muted-foreground">Expires in:</span>
                    <span className={`text-2xl font-mono font-extrabold ${timeLeft <= 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {timeLeft}s
                    </span>
                  </div>

                  {/* Lecture Info */}
                  <div className="p-3 rounded-xl bg-secondary/50 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Lecture Session ID</p>
                      <p className="font-mono text-muted-foreground mt-0.5">{qrData.lectureId.slice(0, 18)}...</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={copyLectureId} className="h-8 px-2 text-xs">
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column: Live Session Attendance Roster */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 rounded-2xl shadow-xl overflow-hidden glass-card h-full flex flex-col">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" /> Live Attendance Roster
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {summary ? `${summary.present} Present • ${summary.pending} Pending / Absent` : 'Enrolled students appear here'}
                  </p>
                </div>
                {qrData && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] animate-pulse">
                    Live Sync
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 flex-1 flex flex-col">
              {!qrData ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Users className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-semibold">No active session</p>
                  <p className="text-xs mt-1 max-w-xs">
                    Select a subject and click "Start Session & Generate QR" to track real-time attendance and manually mark students.
                  </p>
                </div>
              ) : roster.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">No students enrolled in this subject yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {roster.map((student: any) => {
                    const isPresent = student.status === 'present';
                    const isAbsent = student.status === 'absent';
                    const isPending = !student.status || student.status === 'pending';

                    return (
                      <div
                        key={student.studentId}
                        className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors border border-border/30 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center font-bold text-emerald-500 flex-shrink-0">
                            {student.studentName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="truncate">
                            <p className="font-semibold truncate">{student.studentName}</p>
                            <p className="text-[10px] text-muted-foreground">{student.studentRollNumber || 'No Roll No'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize font-medium ${
                              isPresent
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : isAbsent
                                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {student.status || 'Pending'}
                          </Badge>

                          {/* Manual Quick Action buttons */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              manualMarkMutation.mutate({
                                studentId: student.studentId,
                                subjectId,
                                lectureId: qrData.lectureId,
                                status: 'present',
                              })
                            }
                            disabled={manualMarkMutation.isPending || isPresent}
                            className="h-7 px-2 text-[10px] text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            title="Mark Present"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1" /> Present
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              manualMarkMutation.mutate({
                                studentId: student.studentId,
                                subjectId,
                                lectureId: qrData.lectureId,
                                status: 'absent',
                              })
                            }
                            disabled={manualMarkMutation.isPending || isAbsent}
                            className="h-7 px-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Mark Absent"
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" /> Absent
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
