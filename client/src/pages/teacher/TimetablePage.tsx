import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { timetableApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Clock, MapPin, BookOpen, QrCode, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayColors = [
  'from-gray-500/10 to-gray-500/5',
  'from-blue-500/10 to-cyan-500/5',
  'from-emerald-500/10 to-teal-500/5',
  'from-violet-500/10 to-purple-500/5',
  'from-amber-500/10 to-orange-500/5',
  'from-rose-500/10 to-pink-500/5',
  'from-gray-500/10 to-gray-500/5',
];

function isCurrentClass(startTime?: string, endTime?: string): boolean {
  if (!startTime || !endTime) return false;
  const now = new Date();
  const [sh = 0, sm = 0] = startTime.split(':').map(Number);
  const [eh = 0, em = 0] = endTime.split(':').map(Number);
  const currentMin = now.getHours() * 60 + now.getMinutes();
  return currentMin >= sh * 60 + sm && currentMin < eh * 60 + em;
}

function isUpcoming(startTime?: string): boolean {
  if (!startTime) return false;
  const now = new Date();
  const [sh = 0, sm = 0] = startTime.split(':').map(Number);
  const currentMin = now.getHours() * 60 + now.getMinutes();
  return sh * 60 + sm > currentMin;
}

export default function TeacherTimetablePage() {
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);

  const { data: timetableData, isLoading } = useQuery({
    queryKey: ['teacher-timetable', selectedDay],
    queryFn: () => timetableApi.getTimetable({ dayOfWeek: String(selectedDay) }).then((r) => r.data.data),
  });

  const entries = timetableData?.entries || [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">My Schedule</h2>
            <p className="text-sm text-muted-foreground">Your teaching schedule for the week</p>
          </div>
        </div>
      </motion.div>

      {/* Day Tabs */}
      <motion.div variants={item}>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {dayNames.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDay(idx)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                selectedDay === idx
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
                  : idx === today
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
            >
              {day.slice(0, 3)}
              {idx === today && <span className="ml-1 text-[10px] opacity-70">(Today)</span>}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Current Class Banner */}
      {selectedDay === today && entries.length > 0 && (
        <motion.div variants={item}>
          {entries.filter((e: any) => isCurrentClass(e.startTime, e.endTime)).map((cls: any) => (
            <Card key={cls.id} className="border-0 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/20 overflow-hidden relative">
              <div className="absolute top-3 right-3">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                </span>
              </div>
              <CardContent className="p-6">
                <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-2">🔴 Currently Teaching</p>
                <h3 className="text-xl font-bold">{cls.subjectName || 'Class'} <span className="text-emerald-200 text-sm font-mono">({cls.subjectCode})</span></h3>
                <div className="flex items-center gap-4 mt-3 text-emerald-100 text-sm">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {cls.startTime} – {cls.endTime}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {cls.room}</span>
                </div>
                <Link to="/teacher/generate-qr" className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold transition-colors">
                  <QrCode className="w-4 h-4" /> Generate QR for this class
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Schedule */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : entries.length > 0 ? (
        <motion.div variants={item} className="space-y-3">
          {entries
            .filter((e: any) => selectedDay !== today || !isCurrentClass(e.startTime, e.endTime))
            .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
            .map((cls: any) => {
              const upcoming = selectedDay === today && isUpcoming(cls.startTime);
              return (
                <Card key={cls.id} className={`border-0 rounded-2xl shadow-md transition-all hover:shadow-lg ${upcoming ? 'ring-1 ring-blue-500/20' : 'opacity-85'}`}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${dayColors[selectedDay]} flex flex-col items-center justify-center`}>
                      <Clock className="w-4 h-4 text-muted-foreground mb-0.5" />
                      <span className="text-[10px] font-bold text-muted-foreground">{cls.startTime}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{cls.subjectName || 'Class'}</p>
                        <Badge variant="outline" className="text-[10px] capitalize">{cls.type || 'lecture'}</Badge>
                        {upcoming && <Badge className="bg-blue-500/10 text-blue-500 border-0 text-[10px]">Upcoming</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {cls.startTime} – {cls.endTime} • {cls.department} Sem {cls.semester} {cls.division}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {cls.room}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <Card className="border-0 rounded-2xl shadow-lg">
            <CardContent className="py-16 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">
                {selectedDay === today ? 'No classes scheduled today' : `No classes scheduled for ${dayNames[selectedDay]}`}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Enjoy your free day or prepare class notes!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
