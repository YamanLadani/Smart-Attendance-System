import { useQuery } from '@tanstack/react-query';
import { timetableApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Clock, MapPin, BookOpen, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { TimetableEntry } from '@/types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const today = new Date().getDay();

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function TimetablePage() {
  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['timetable-today'],
    queryFn: () => timetableApi.getTodaysTimetable().then((r) => r.data.data),
  });

  const { data: weekData, isLoading: weekLoading } = useQuery({
    queryKey: ['timetable-week'],
    queryFn: () => timetableApi.getTimetable().then((r) => r.data.data),
  });

  if (todayLoading || weekLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const statusBorder = (status?: string) => {
    if (status === 'current') return 'border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/[0.03]';
    if (status === 'upcoming') return 'border-l-blue-500 bg-blue-500/5 dark:bg-blue-500/[0.03]';
    return 'border-l-transparent bg-secondary/50';
  };

  const typeStyle = (type?: string) => {
    if (type === 'practical') return 'bg-purple-500/10 text-purple-500';
    if (type === 'tutorial') return 'bg-amber-500/10 text-amber-600';
    return 'bg-blue-500/10 text-blue-500';
  };

  const renderEntry = (entry: TimetableEntry) => (
    <div
      key={entry.id}
      className={`p-4 rounded-xl border-l-[3px] ${statusBorder(entry.status)} transition-all duration-200 hover:shadow-md`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <p className="font-semibold text-sm">{entry.subjectName || 'Unknown Subject'}</p>
            <Badge variant="secondary" className={`text-[10px] font-semibold px-2 py-0 ${typeStyle(entry.type)}`}>
              {entry.type || 'lecture'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {String(entry.startTime)} - {String(entry.endTime)}
            </span>
            {entry.room && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {String(entry.room)}
              </span>
            )}
          </div>
          {entry.teacherName && (
            <p className="text-xs text-muted-foreground">by {String(entry.teacherName)}</p>
          )}
        </div>
        {entry.status && (
          <Badge variant={entry.status === 'current' ? 'default' : 'secondary'} className="text-[10px] rounded-lg">
            {entry.status === 'current' ? '🟢 Now' : String(entry.status)}
          </Badge>
        )}
      </div>
    </div>
  );

  // Group week data by day
  const weekByDay: Record<number, TimetableEntry[]> = {};
  if (weekData?.entries) {
    for (const entry of weekData.entries) {
      const day = entry.dayOfWeek;
      if (!weekByDay[day]) weekByDay[day] = [];
      weekByDay[day].push(entry);
    }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-7">
      {/* Today's Schedule */}
      <motion.div variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-base">Today — {DAYS[today]}</h3>
            <p className="text-xs text-muted-foreground">Your schedule for today</p>
          </div>
        </div>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-5 space-y-3">
            {todayData?.entries && todayData.entries.length > 0 ? (
              todayData.entries.map(renderEntry)
            ) : (
              <div className="text-center py-12">
                <Sparkles className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
                <p className="text-muted-foreground font-medium">No classes today 🎉</p>
                <p className="text-sm text-muted-foreground/60">Enjoy your free day!</p>
              </div>
            )}

            {todayData?.freePeriods && todayData.freePeriods.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Free Periods</p>
                <div className="flex flex-wrap gap-2">
                  {todayData.freePeriods.map((fp, i) => (
                    <Badge key={i} variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg px-3 py-1">
                      {fp.startTime} - {fp.endTime} ({fp.duration}min)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Weekly View */}
      <motion.div variants={item}>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Weekly Timetable</h3>
        <Card className="border-0 rounded-2xl shadow-lg">
          <CardContent className="p-5">
            <Tabs defaultValue={String(today === 0 ? 1 : today)}>
              <TabsList className="w-full grid grid-cols-6 rounded-xl bg-secondary/50 p-1">
                {[1, 2, 3, 4, 5, 6].map((day) => (
                  <TabsTrigger key={day} value={String(day)} className="rounded-lg text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    {SHORT_DAYS[day]}
                  </TabsTrigger>
                ))}
              </TabsList>
              {[1, 2, 3, 4, 5, 6].map((day) => (
                <TabsContent key={day} value={String(day)} className="space-y-3 mt-4">
                  {weekByDay[day] && weekByDay[day].length > 0 ? (
                    weekByDay[day].map(renderEntry)
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground">No classes on {DAYS[day]}</p>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
