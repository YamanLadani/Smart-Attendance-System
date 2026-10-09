import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { attendanceApi, reportApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, BarChart3, TrendingUp, CheckCircle, XCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function StudentReportsPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['student-attendance-stats'],
    queryFn: () => attendanceApi.getStats().then(r => r.data.data),
  });

  const { data: historyData } = useQuery({
    queryKey: ['attendance-history'],
    queryFn: () => attendanceApi.getHistory({ limit: '50' }).then(r => r.data.data),
  });

  const handleDownload = async (format: 'pdf' | 'csv') => {
    try {
      setDownloading(format);
      const params: Record<string, string> = {
        startDate: startDate || '',
        endDate: endDate || '',
        title: 'My Attendance Report',
      };
      const response = format === 'pdf'
        ? await reportApi.downloadPDF(params)
        : await reportApi.downloadCSV(params);

      const blob = new Blob([response.data as BlobPart], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my_attendance_${startDate}_to_${endDate}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${format.toUpperCase()} downloaded!`);
    } catch {
      toast.error(`Failed to download ${format.toUpperCase()} report`);
    } finally {
      setDownloading(null);
    }
  };

  const stats = statsData as any;
  const records = (historyData as any)?.records || [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">My Reports</h2>
            <p className="text-sm text-muted-foreground">View and download your attendance reports</p>
          </div>
        </div>
      </motion.div>

      {/* Overall Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-6 h-6 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                {stats?.overallPercentage ?? stats?.attendancePercentage ?? 0}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Overall Attendance</p>
            </CardContent>
          </Card>
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {stats?.presentCount ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Classes Attended</p>
            </CardContent>
          </Card>
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-red-500/5 to-rose-500/5">
            <CardContent className="p-4 text-center">
              <XCircle className="w-6 h-6 mx-auto text-red-500 mb-2" />
              <p className="text-2xl font-extrabold text-red-600 dark:text-red-400">
                {stats?.absentCount ?? 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Classes Missed</p>
            </CardContent>
          </Card>
          <Card className="border-0 rounded-2xl shadow-md bg-gradient-to-br from-violet-500/5 to-purple-500/5">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-violet-500 mb-2" />
              <p className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">
                {stats?.totalClasses ?? (stats?.presentCount ?? 0) + (stats?.absentCount ?? 0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Total Classes</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Download Section */}
      <motion.div variants={item}>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Download className="w-4 h-4" /> Download Report
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl h-11" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl h-11" />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={() => handleDownload('pdf')}
                  disabled={downloading !== null}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white"
                >
                  {downloading === 'pdf' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                  PDF
                </Button>
                <Button
                  onClick={() => handleDownload('csv')}
                  disabled={downloading !== null}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                >
                  {downloading === 'csv' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                  CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subject-wise Breakdown */}
      {stats?.subjectWise && stats.subjectWise.length > 0 && (
        <motion.div variants={item}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Subject-wise Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.subjectWise.map((s: any, idx: number) => (
              <Card key={idx} className="border-0 rounded-2xl shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">{s.subjectName || s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.subjectCode || s.code}</p>
                    </div>
                    <Badge className={`rounded-lg px-3 py-1 text-xs font-bold border-0 ${
                      (s.percentage || s.attendanceRate || 0) >= 75 ? 'bg-emerald-500/10 text-emerald-500' :
                      (s.percentage || s.attendanceRate || 0) >= 50 ? 'bg-amber-500/10 text-amber-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {s.percentage || s.attendanceRate || 0}%
                    </Badge>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        (s.percentage || s.attendanceRate || 0) >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                        (s.percentage || s.attendanceRate || 0) >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                        'bg-gradient-to-r from-red-500 to-rose-400'
                      }`}
                      style={{ width: `${s.percentage || s.attendanceRate || 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Present: {s.present || s.presentCount || 0} / {s.total || s.totalClasses || 0}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Records */}
      {records.length > 0 && (
        <motion.div variants={item}>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recent Records</h3>
          <Card className="border-0 rounded-2xl shadow-lg">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {records.slice(0, 15).map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-accent/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{record.subjectName || 'Subject'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                    <Badge className={`rounded-lg px-3 py-1 text-xs font-semibold border-0 ${
                      record.status === 'present' ? 'bg-emerald-500/10 text-emerald-500' :
                      record.status === 'late' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
