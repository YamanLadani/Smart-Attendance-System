import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timetableApi, adminApi } from '@/api/endpoints';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Plus, Clock, MapPin, Trash2, BookOpen, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import type { TimetableEntry, Subject } from '@/types';

const DEPARTMENTS = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Electrical'];
const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

export default function AdminTimetablePage() {
  const [selectedDept, setSelectedDept] = useState('Computer Science');
  const [selectedSem, setSelectedSem] = useState('5');
  const [selectedDiv, setSelectedDiv] = useState('A');
  const [selectedDay, setSelectedDay] = useState(1);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimetableEntry | null>(null);

  // Form state
  const [form, setForm] = useState({
    subjectId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    room: 'CR-101',
    type: 'lecture' as 'lecture' | 'practical' | 'tutorial',
  });

  const queryClient = useQueryClient();

  // Fetch timetable entries
  const { data: timetableData, isLoading } = useQuery({
    queryKey: ['admin-timetable', selectedDept, selectedSem, selectedDiv],
    queryFn: () =>
      timetableApi.getTimetable({
        department: selectedDept,
        semester: selectedSem,
        division: selectedDiv,
      }).then((r) => r.data.data),
  });

  // Fetch subjects for this department & semester
  const { data: subjectsData } = useQuery({
    queryKey: ['admin-subjects-list', selectedDept, selectedSem],
    queryFn: () =>
      adminApi.getSubjects({
        department: selectedDept,
        semester: selectedSem,
      }).then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => timetableApi.createTimetable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-timetable'] });
      setIsAddOpen(false);
      setForm({
        subjectId: '',
        dayOfWeek: selectedDay,
        startTime: '09:00',
        endTime: '10:00',
        room: 'CR-101',
        type: 'lecture',
      });
      toast.success('Timetable entry added! 🎉');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to add entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timetableApi.deleteTimetable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-timetable'] });
      setDeleteTarget(null);
      toast.success('Entry removed');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to delete entry'),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subjectId || !form.startTime || !form.endTime || !form.room) {
      toast.error('Please fill all required fields');
      return;
    }

    createMutation.mutate({
      department: selectedDept,
      semester: parseInt(selectedSem, 10),
      division: selectedDiv,
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      room: form.room,
      type: form.type,
      subjectId: form.subjectId,
    });
  };

  const entries: TimetableEntry[] = timetableData?.entries || [];
  const dayEntries = entries
    .filter((e) => e.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> Timetable Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure academic schedules, class timings, and lecture rooms
          </p>
        </div>
        <Button
          onClick={() => {
            setForm((prev) => ({ ...prev, dayOfWeek: selectedDay }));
            setIsAddOpen(true);
          }}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Add Timetable Slot
        </Button>
      </div>

      {/* Scope Selectors */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Department</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Semester (1 - 5)</Label>
            <Select value={selectedSem} onValueChange={setSelectedSem}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((s) => (
                  <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Division</Label>
            <Select value={selectedDiv} onValueChange={setSelectedDiv}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['A', 'B', 'C', 'D'].map((d) => (
                  <SelectItem key={d} value={d}>Division {d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Days Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {DAYS.map((d) => {
          const count = entries.filter((e) => e.dayOfWeek === d.id).length;
          return (
            <button
              key={d.id}
              onClick={() => setSelectedDay(d.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-2 ${
                selectedDay === d.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-card hover:bg-muted text-muted-foreground border border-border/50'
              }`}
            >
              <span>{d.name}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${selectedDay === d.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day Schedule Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : dayEntries.length > 0 ? (
        <div className="space-y-3">
          {dayEntries.map((slot) => (
            <Card key={slot.id} className="border-0 shadow-md hover:shadow-lg transition-all rounded-2xl bg-card">
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex flex-col items-center justify-center text-blue-500 shrink-0">
                    <Clock className="w-4 h-4 mb-0.5" />
                    <span className="text-[10px] font-bold">{slot.startTime}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-base text-foreground">{slot.subjectName || 'Subject'}</h4>
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {slot.subjectCode || 'CODE'}
                      </Badge>
                      <Badge className="capitalize text-[10px] bg-primary/10 text-primary border-0">
                        {slot.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {slot.room}
                      </span>
                      {slot.teacherName && (
                        <span>Faculty: <strong className="text-foreground">{slot.teacherName}</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(slot)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-md rounded-2xl">
          <CardContent className="py-16 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-base font-semibold text-foreground">No slots configured for {DAYS.find(d => d.id === selectedDay)?.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click &quot;Add Timetable Slot&quot; to schedule classes for {selectedDept} Sem {selectedSem} Div {selectedDiv}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Slot Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Add Timetable Slot
            </DialogTitle>
            <DialogDescription>
              Schedule a lecture/practical for {selectedDept} Sem {selectedSem} ({selectedDiv}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Day of Week *</Label>
              <Select
                value={String(form.dayOfWeek)}
                onValueChange={(val) => setForm({ ...form, dayOfWeek: parseInt(val, 10) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Select
                value={form.subjectId}
                onValueChange={(val) => setForm({ ...form, subjectId: val })}
              >
                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {subjectsData?.subjects?.map((s: Subject) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Time *</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Room / Lab *</Label>
                <Input
                  placeholder="e.g. CR-302 / Lab 4"
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Session Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={(val: any) => setForm({ ...form, type: val })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture">Lecture</SelectItem>
                    <SelectItem value="practical">Practical / Lab</SelectItem>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
                {createMutation.isPending ? 'Scheduling...' : 'Add Slot'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Remove Schedule Slot
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deleteTarget?.subjectName}</strong> at {deleteTarget?.startTime}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? 'Removing...' : 'Remove Slot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
