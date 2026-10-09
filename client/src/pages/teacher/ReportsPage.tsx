import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teacherApi, reportApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Calendar, Filter, BarChart3, Users, FileSpreadsheet, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: dashData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => teacherApi.getDashboard().then((r) => r.data.data),
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['teacher-analytics'],
    queryFn: () => teacherApi.getAnalytics().then((r) => r.data.data),
  });

  const handleDownload = async (format: 'pdf' | 'csv') => {
    try {
      setDownloading(format);
      const params: Record<string, string> = {
        startDate: startDate || '',
        endDate: endDate || '',
      };
      if (selectedSubject) params.subjectId = selectedSubject;
      params.title = 'Attendance Report';

      const response = format === 'pdf'
        ? await reportApi.downloadPDF(params)
        : await reportApi.downloadCSV(params);

      const blob = new Blob([response.data as BlobPart], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_report_${startDate}_to_${endDate}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} report downloaded!`);
    } catch {
      toast.error(`Failed to download ${format.toUpperCase()} report`);
    } finally {
      setDownloading(null);
    }
  };

  const subjectStats = (analyticsData as any)?.subjectStats || [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Reports</h2>
            <p className="text-sm text-muted-foreground">Generate and download attendance reports</p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item}>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Filter Reports</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl h-11" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl h-11" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Subject</Label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full h-11 rounded-xl border bg-background px-3 text-sm"
                >
                  <option value="">All Subjects</option>
                  {dashData?.subjects?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => handleDownload('pdf')}
                  disabled={downloading !== null}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white shadow-lg shadow-red-500/20"
                >
                  {downloading === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  PDF
                </Button>
                <Button
                  onClick={() => handleDownload('csv')}
                  disabled={downloading !== null}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20"
                >
                  {downloading === 'csv' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                  CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={item}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Subject-wise Summary</h3>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : subjectStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjectStats.map((stat: any) => (
              <Card key={stat.subjectId} className="border-0 rounded-2xl shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{stat.subjectName}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{stat.subjectCode}</p>
                    </div>
                    <Badge className={`rounded-lg px-3 py-1 text-xs font-bold border-0 ${
                      stat.attendanceRate >= 75 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      stat.attendanceRate >= 50 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      'bg-red-500/10 text-red-600 dark:text-red-400'
                    }`}>
                      {stat.attendanceRate}%
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-muted-foreground">Present: {stat.presentCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-muted-foreground">Absent: {stat.absentCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">Total: {stat.totalRecords}</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        stat.attendanceRate >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                        stat.attendanceRate >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                        'bg-gradient-to-r from-red-500 to-rose-400'
                      }`}
                      style={{ width: `${stat.attendanceRate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 rounded-2xl shadow-lg">
            <CardContent className="py-16 text-center">
              <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">No data available</p>
              <p className="text-sm text-muted-foreground mt-1">Attendance records will appear here</p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Overview Cards */}
      <motion.div variants={item}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{dashData?.todayAttendanceCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Marked Today</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-violet-500/5 to-purple-500/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-400 flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{dashData?.totalStudents ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Students</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-md">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{dashData?.subjectCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Subjects</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
}
