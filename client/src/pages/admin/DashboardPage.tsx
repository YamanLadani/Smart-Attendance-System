import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, GraduationCap, BookOpen, CalendarDays, Building2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard().then((r) => r.data.data),
  });
  const firstName = user?.displayName?.split(' ')[0] || 'Admin';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  const stats = [
    { label: 'Students', value: data?.totalStudents ?? 0, icon: GraduationCap, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20', light: 'text-blue-100', lighter: 'text-blue-200' },
    { label: 'Teachers', value: data?.totalTeachers ?? 0, icon: BookOpen, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20', light: 'text-emerald-100', lighter: 'text-emerald-200' },
    { label: 'Admins', value: data?.totalAdmins ?? 0, icon: Users, gradient: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-500/20', light: 'text-amber-100', lighter: 'text-amber-200' },
    { label: "Today's Attendance", value: data?.totalAttendanceToday ?? 0, icon: CalendarDays, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20', light: 'text-violet-100', lighter: 'text-violet-200' },
  ];

  const deptData = data?.departments?.map((d, i) => ({
    name: d.department || 'Unknown',
    count: d.count,
    fill: COLORS[i % COLORS.length],
  })) || [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-7">
      {/* Greeting */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold">
          Hello 👋 <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{firstName}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d')} — System administration overview
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} variants={item}>
              <Card className={`relative overflow-hidden border-0 rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-xl ${s.shadow}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`${s.light} text-sm font-medium`}>{s.label}</p>
                      <p className="text-4xl font-extrabold mt-1">{s.value}</p>
                      <p className={`${s.lighter} text-xs mt-2`}>Total registered</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Icon className="w-7 h-7" />
                    </div>
                  </div>
                  <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/[0.07]" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Department Chart */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-base">Department Distribution</h3>
        </div>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-6">
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={deptData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                  <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  }} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {deptData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-16">No department data</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
