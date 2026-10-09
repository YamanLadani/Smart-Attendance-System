import { useQuery } from '@tanstack/react-query';
import { teacherApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { motion } from 'framer-motion';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['teacher-analytics'],
    queryFn: () => teacherApi.getAnalytics().then((r) => r.data.data as {
      subjectStats: { subjectName: string; subjectCode: string; totalRecords: number; presentCount: number; attendanceRate: number }[];
      dailyTrend: { date: string; total: number; present: number }[];
    }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const subjectData = data?.subjectStats?.map((s) => ({
    name: s.subjectCode || s.subjectName.substring(0, 8),
    rate: s.attendanceRate,
    fullName: s.subjectName,
    total: s.totalRecords,
    present: s.presentCount,
  })) || [];

  const trendData = data?.dailyTrend?.map((d) => ({
    date: d.date.slice(5),
    total: d.total,
    present: d.present,
    rate: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
  })) || [];

  const getBarColor = (rate: number) =>
    rate >= 75 ? '#10b981' : rate >= 60 ? '#f59e0b' : '#ef4444';

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-7">
      {/* Subject-wise */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-base">Subject-wise Attendance</h3>
        </div>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            {subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip contentStyle={tooltipStyle}
                    formatter={(value: any, _: any, props: any) => [
                      `${value}% (${props?.payload?.present || 0}/${props?.payload?.total || 0})`,
                      props?.payload?.fullName || 'Subject',
                    ]}
                  />
                  <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                    {subjectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-16">No data available yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Trend */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-base">Daily Trend (Last 30 Days)</h3>
        </div>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} dot={false} name="Total" />
                  <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} dot={false} name="Present" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-16">No trend data yet</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
