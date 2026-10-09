import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi, timetableApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  BookOpen,
  Upload,
  FileText,
  Loader2,
  Download,
  Trash2,
  Search,
  FileUp,
  Clock,
  Layers,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

export default function TeacherNotesPage() {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [semester, setSemester] = useState('5');
  const [division, setDivision] = useState('A');
  const [search, setSearch] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('all');

  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 1. Fetch teacher's subjects
  const { data: subjects } = useQuery({
    queryKey: ['teacher-subjects'],
    queryFn: () => timetableApi.getSubjects().then((r) => r.data.data?.subjects || []),
  });

  // 2. Fetch teacher's uploaded notes
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['teacher-notes'],
    queryFn: () => teacherApi.getNotes().then((r) => r.data.data?.notes || []),
  });

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => teacherApi.uploadNote(formData),
    onSuccess: () => {
      toast.success('Study note uploaded successfully! 🎉');
      queryClient.invalidateQueries({ queryKey: ['teacher-notes'] });
      setShowUpload(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to upload note');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => teacherApi.deleteNote(noteId),
    onSuccess: () => {
      toast.success('Note deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['teacher-notes'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete note');
    },
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !subjectId || !title.trim()) {
      toast.error('Please select a subject, enter a title, and attach a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('subjectId', subjectId);
    formData.append('title', title.trim());
    formData.append('description', description.trim());
    formData.append('department', department.trim());
    formData.append('semester', semester);
    formData.append('division', division);

    uploadMutation.mutate(formData);
  };

  const resetForm = () => {
    setSubjectId('');
    setTitle('');
    setDescription('');
    setDepartment('Computer Science');
    setSemester('5');
    setDivision('A');
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Filter notes
  const filteredNotes = (notesData || []).filter((note: any) => {
    const matchesSearch =
      !search ||
      note.title?.toLowerCase().includes(search.toLowerCase()) ||
      note.description?.toLowerCase().includes(search.toLowerCase()) ||
      note.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
      note.subjectCode?.toLowerCase().includes(search.toLowerCase());

    const matchesSubject = selectedSubjectFilter === 'all' || note.subjectId === selectedSubjectFilter;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Material & Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload lecture notes, assignment sheets, and study resources for your classes
          </p>
        </div>

        <Button
          onClick={() => setShowUpload(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20"
        >
          <Upload className="mr-2 h-4 w-4" /> Upload New Note
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes by title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
            <SelectTrigger className="h-9 text-xs w-full sm:w-56">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects?.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes List / Grid */}
      {notesLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="border shadow-sm bg-card">
          <CardContent className="py-16 text-center text-muted-foreground">
            <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-20" />
            <p className="text-base font-semibold">No study notes uploaded yet</p>
            <p className="text-xs mt-1 max-w-md mx-auto">
              Share slides, PDF notes, question banks, or reference materials with your students by clicking &quot;Upload New Note&quot;.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredNotes.map((note: any, idx: number) => {
              const fileExt = note.fileName?.split('.').pop()?.toUpperCase() || 'FILE';
              const downloadUrl = note.fileUrl?.startsWith('http')
                ? note.fileUrl
                : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${note.fileUrl}`;

              return (
                <motion.div
                  key={note.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="border rounded-2xl shadow-sm hover:shadow-md transition-all bg-card overflow-hidden h-full flex flex-col justify-between">
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Badge className="font-mono text-xs font-bold bg-primary/10 text-primary border-0">
                          {note.subjectCode || 'GENERAL'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold bg-secondary/80">
                          {fileExt}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-base text-foreground mb-1 line-clamp-2">
                        {note.title}
                      </h3>

                      {note.subjectName && (
                        <p className="text-xs font-medium text-primary/80 mb-2 flex items-center gap-1">
                          <Layers className="w-3 h-3" /> {note.subjectName}
                        </p>
                      )}

                      {note.description && (
                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                          {note.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-4 mt-auto">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {formatFileSize(note.fileSize)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(note.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        {note.semester && (
                          <>
                            <span>•</span>
                            <span>Sem {note.semester}</span>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t flex items-center justify-between gap-2">
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={note.fileName}
                          className="flex-1 inline-flex items-center justify-center rounded-lg text-xs font-semibold h-8 px-3 bg-secondary hover:bg-secondary/80 text-foreground transition-all gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download Note
                        </a>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(`Delete "${note.title}"?`)) {
                              deleteMutation.mutate(note.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" /> Upload Study Material
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload PDF documents, presentations, or worksheets for your students
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Subject *</Label>
              <Select value={subjectId} onValueChange={setSubjectId} required>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.code}) — Sem {s.semester}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Note Title *</Label>
              <Input
                placeholder="e.g., Unit 3: Dynamic Programming Notes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Description (Optional)</Label>
              <Textarea
                placeholder="Brief summary or instructions for students..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Dept" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Electrical'].map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Semester</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Sem" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Division</Label>
                <Select value={division} onValueChange={setDivision}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Div" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D'].map((d) => (
                      <SelectItem key={d} value={d}>Div {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* File Dropzone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Attach File (PDF, DOCX, PPT, TXT, ZIP) *</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-5 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
              >
                {selectedFile ? (
                  <div className="flex items-center gap-3 justify-center">
                    <FileText className="w-8 h-8 text-primary shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-foreground line-clamp-1">{selectedFile.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-7 h-7 text-muted-foreground mb-1.5" />
                    <p className="text-xs font-semibold text-foreground">Click to select a file</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Maximum file size: 15 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.txt,.xlsx,.zip,.rar"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => { setShowUpload(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadMutation.isPending || !selectedFile}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20"
              >
                {uploadMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  'Upload Material'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
