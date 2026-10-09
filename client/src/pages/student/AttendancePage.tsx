import { useQuery } from '@tanstack/react-query';
import { attendanceApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, BookOpen, CheckCircle2, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function AttendancePage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => attendanceApi.getStats().then((r) => r.data.data),
  });

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['attendance-history'],
    queryFn: () => attendanceApi.getHistory().then((r) => r.data.data),
  });

  if (statsLoading || historyLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const overallPct = stats?.overall?.percentage ?? 0;

  const statCards = [
    { label: 'Overall', value: `${overallPct}%`, color: overallPct >= 75 ? 'text-emerald-500' : overallPct >= 60 ? 'text-amber-500' : 'text-red-500', bg: overallPct >= 75 ? 'bg-emerald-500/10' : 'bg-red-500/10', icon: TrendingUp },
    { label: 'Total Classes', value: stats?.overall?.totalClasses ?? 0, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: BookOpen },
    { label: 'Present', value: stats?.overall?.presentCount ?? 0, color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
    { label: 'Absent', value: stats?.overall?.absentCount ?? 0, color: 'text-red-500', bg: 'bg-red-500/10', icon: XCircle },
  ];

  const chartData = stats?.subjectWise?.map((s) => ({
    name: s.subjectCode || s.subjectName?.substring(0, 8) || 'N/A',
    percentage: s.percentage,
    fullName: s.subjectName,
  })) || [];

  const getBarColor = (pct: number) =>
    pct >= 75 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-7">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} variants={item}>
              <Card className="border-0 rounded-2xl shadow-lg card-hover">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                  </div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Subject Chart */}
      <motion.div variants={item}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Subject-wise Attendance</h3>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                    }}
                    formatter={(value: any, _: any, props: any) => [
                      `${value}%`,
                      props?.payload?.fullName || 'Subject',
                    ]}
                  />
                  <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.percentage)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">No attendance data yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* History */}
      <motion.div variants={item}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Attendance History</h3>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-0">
            {history?.records && history.records.length > 0 ? (
              <div className="divide-y divide-border">
                {history.records.map((record) => (
                  <div key={record.id} className="flex items-center justify-between px-6 py-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">
                          {format(new Date(record.date), 'dd')}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{record.subjectName || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.date), 'dd MMM yyyy, hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <Badge className={`rounded-lg px-3 py-1 text-xs font-semibold border-0 ${
                      record.status === 'present' ? 'bg-emerald-500/10 text-emerald-500'
                      : record.status === 'late' ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-red-500/10 text-red-500'
                    }`}>
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">No records found</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
