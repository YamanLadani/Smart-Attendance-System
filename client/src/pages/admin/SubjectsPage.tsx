import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, teacherApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BookOpen, Plus, Search, Edit2, Users, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import type { Subject } from '@/types';

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', code: '', department: '', semester: '', credits: '', type: 'core' as string,
    year: '', teachingHours: '', academicYear: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-subjects', filterDept, filterSem],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filterDept) params.department = filterDept;
      if (filterSem) params.semester = filterSem;
      const res = await adminApi.getSubjects(params);
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminApi.createSubject(data),
    onSuccess: () => {
      toast.success('Subject created!');
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      setShowCreate(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => adminApi.updateSubject(id, data),
    onSuccess: () => {
      toast.success('Subject updated!');
      queryClient.invalidateQueries({ queryKey: ['admin-subjects'] });
      setEditSubject(null);
      resetForm();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to update'),
  });

  const resetForm = () => setForm({ name: '', code: '', department: '', semester: '', credits: '', type: 'core', year: '', teachingHours: '', academicYear: '' });

  const handleCreate = () => {
    if (!form.name || !form.code || !form.department || !form.semester) {
      toast.error('Name, code, department, and semester are required');
      return;
    }
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editSubject) return;
    updateMutation.mutate({ id: editSubject.id, data: form });
  };

  const openEdit = (s: Subject) => {
    setEditSubject(s);
    setForm({
      name: s.name, code: s.code, department: s.department, semester: String(s.semester),
      credits: String(s.credits || ''), type: s.type, year: String(s.year || ''),
      teachingHours: String(s.teachingHours || ''), academicYear: s.academicYear || '',
    });
  };

  const filtered = data?.subjects?.filter((s: Subject) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const typeLabel = (t: string) => {
    const map: Record<string, string> = {
      core: 'Core', elective: 'Elective', university_elective: 'Uni Elective', audit_course: 'Audit',
      project: 'Project', internship: 'Internship', skill_augmentation: 'Skill Aug.', theory: 'Theory', practical: 'Practical', tutorial: 'Tutorial',
    };
    return map[t] || t;
  };

  const typeColor = (t: string) => {
    const map: Record<string, string> = {
      core: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      elective: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      practical: 'bg-green-500/10 text-green-400 border-green-500/20',
      project: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    return map[t] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Subjects</h1>
          <p className="text-sm text-white/50 mt-1">{data?.total || 0} subjects registered</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowCreate(true); }}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Subject
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white" />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Depts</SelectItem>
            {['CSE', 'IT', 'CE', 'ECE', 'ME'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSem} onValueChange={setFilterSem}>
          <SelectTrigger className="w-[140px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sems</SelectItem>
            {[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Subject Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="py-16 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="text-white/40">No subjects found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s: Subject, i: number) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] transition-colors group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{s.name}</h3>
                      <p className="text-xs text-white/40 mt-0.5">{s.code}</p>
                    </div>
                    <button onClick={() => openEdit(s)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/10">
                      <Edit2 className="w-3.5 h-3.5 text-white/50" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className={typeColor(s.type)}>{typeLabel(s.type)}</Badge>
                    <Badge variant="outline" className="bg-white/5 text-white/50 border-white/10">Sem {s.semester}</Badge>
                    {s.credits > 0 && <Badge variant="outline" className="bg-white/5 text-white/50 border-white/10">{s.credits} cr</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/40">
                    <span>{s.department}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{s.enrolledStudents || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate || !!editSubject} onOpenChange={(open) => { if (!open) { setShowCreate(false); setEditSubject(null); } }}>
        <DialogContent className="bg-[#0f1420] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editSubject ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Name *</Label><Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1" /></div>
              <div><Label className="text-white/70">Code *</Label><Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-white/70">Department *</Label>
                <Select value={form.department} onValueChange={(v) => setForm(p => ({ ...p, department: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{['CSE', 'IT', 'CE', 'ECE', 'ME'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-white/70">Semester *</Label>
                <Select value={form.semester} onValueChange={(v) => setForm(p => ({ ...p, semester: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5,6,7,8].map(s => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label className="text-white/70">Credits</Label><Input type="number" value={form.credits} onChange={(e) => setForm(p => ({ ...p, credits: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1" /></div>
              <div><Label className="text-white/70">Year</Label><Input type="number" value={form.year} onChange={(e) => setForm(p => ({ ...p, year: e.target.value }))} className="bg-white/5 border-white/10 text-white mt-1" /></div>
              <div><Label className="text-white/70">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['core','elective','university_elective','audit_course','project','internship','skill_augmentation','theory','practical','tutorial'].map(t =>
                      <SelectItem key={t} value={t}>{typeLabel(t)}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditSubject(null); }} className="border-white/10 text-white/70">Cancel</Button>
            <Button onClick={editSubject ? handleUpdate : handleCreate} disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editSubject ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
