import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Loader2, Calendar, TrendingUp, Users, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminAttendancePage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-attendance-analytics', startDate, endDate],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await adminApi.getAttendanceAnalytics(params);
      return res.data.data as any;
    },
  });

  const overall = data?.overall || { total: 0, present: 0, absent: 0, late: 0 };
  const monthlyTrend = data?.monthlyTrend || [];
  const attendanceRate = overall.total > 0 ? Math.round((overall.present / overall.total) * 1000) / 10 : 0;

  const stats = [
    { label: 'Total Records', value: overall.total, icon: BarChart3, color: 'from-blue-500 to-cyan-400' },
    { label: 'Present', value: overall.present, icon: CheckCircle2, color: 'from-green-500 to-emerald-400' },
    { label: 'Absent', value: overall.absent, icon: Users, color: 'from-red-500 to-rose-400' },
    { label: 'Overall Rate', value: `${attendanceRate}%`, icon: TrendingUp, color: 'from-purple-500 to-pink-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance Analytics</h1>
          <p className="text-sm text-white/50 mt-1">System-wide attendance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="bg-white/5 border-white/10 text-white w-[160px]" />
          <span className="text-white/30">to</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="bg-white/5 border-white/10 text-white w-[160px]" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="bg-white/[0.03] border-white/[0.06]">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                        <stat.icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-white/40 mt-0.5">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Monthly Trend */}
          <Card className="bg-white/[0.03] border-white/[0.06]">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" /> Monthly Trend
              </h3>
              {monthlyTrend.length === 0 ? (
                <p className="text-sm text-white/40 text-center py-8">No data available for the selected period</p>
              ) : (
                <div className="space-y-3">
                  {monthlyTrend.map((m: any, i: number) => {
                    const rate = m.total > 0 ? Math.round((m.present / m.total) * 100) : 0;
                    return (
                      <motion.div key={m.month} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-4">
                        <span className="text-xs text-white/50 w-20 flex-shrink-0">{m.month}</span>
                        <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
                            style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs text-white/60 w-12 text-right">{rate}%</span>
                        <span className="text-xs text-white/30 w-16 text-right">{m.present}/{m.total}</span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
