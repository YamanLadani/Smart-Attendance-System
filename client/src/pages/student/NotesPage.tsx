import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen,
  Download,
  Search,
  FileText,
  Loader2,
  Clock,
  User,
  Layers,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StudentNotesPage() {
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');

  // Fetch student-accessible notes
  const { data: notesData, isLoading } = useQuery({
    queryKey: ['student-notes'],
    queryFn: async () => {
      const res = await studentApi.getNotes();
      return res.data.data?.notes || [];
    },
  });

  const notesList = notesData || [];

  // Extract unique subjects from notes for filter dropdown
  const uniqueSubjects = Array.from(
    new Map(
      notesList
        .filter((n: any) => n.subjectId && n.subjectName)
        .map((n: any) => [n.subjectId, { id: n.subjectId, name: n.subjectName, code: n.subjectCode }])
    ).values()
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredNotes = notesList.filter((note: any) => {
    const matchesSearch =
      !search ||
      note.title?.toLowerCase().includes(search.toLowerCase()) ||
      note.description?.toLowerCase().includes(search.toLowerCase()) ||
      note.subjectName?.toLowerCase().includes(search.toLowerCase()) ||
      note.subjectCode?.toLowerCase().includes(search.toLowerCase()) ||
      note.teacherName?.toLowerCase().includes(search.toLowerCase());

    const matchesSubject = selectedSubject === 'all' || note.subjectId === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Course Notes & Resources</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access lecture presentations, reference material, and assignments uploaded by your professors
          </p>
        </div>

        <Badge variant="outline" className="px-3 py-1.5 bg-card border text-xs font-semibold self-start sm:self-auto">
          <BookOpen className="w-3.5 h-3.5 mr-1.5 text-primary" />
          {notesList.length} Available Resources
        </Badge>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by topic, subject, or professor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="h-9 text-xs w-full sm:w-60">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {uniqueSubjects.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card className="border shadow-sm bg-card">
          <CardContent className="py-20 text-center text-muted-foreground">
            <BookOpen className="w-16 h-16 mx-auto mb-3 opacity-20" />
            <p className="text-base font-semibold">No study notes available</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              When your subject teachers upload lecture notes, slides, or study documents for your classes, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filteredNotes.map((note: any, idx: number) => {
              const fileExt = note.fileName?.split('.').pop()?.toUpperCase() || 'DOC';
              const downloadUrl = note.fileUrl?.startsWith('http')
                ? note.fileUrl
                : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${note.fileUrl}`;

              return (
                <motion.div
                  key={note.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="border rounded-2xl shadow-sm hover:shadow-md transition-all bg-card overflow-hidden h-full flex flex-col justify-between">
                    <CardContent className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <Badge className="font-mono text-xs font-bold bg-primary/10 text-primary border-0">
                          {note.subjectCode || 'GENERAL'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-bold uppercase bg-secondary/80">
                          {fileExt}
                        </Badge>
                      </div>

                      <h3 className="font-bold text-base text-foreground mb-1 line-clamp-2">
                        {note.title}
                      </h3>

                      {note.subjectName && (
                        <p className="text-xs font-semibold text-primary/80 mb-2 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" /> {note.subjectName}
                        </p>
                      )}

                      {note.description && (
                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                          {note.description}
                        </p>
                      )}

                      <div className="space-y-1.5 text-xs text-muted-foreground mt-auto pt-3 border-t">
                        {note.teacherName && (
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <span>Prof. {note.teacherName}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {formatFileSize(note.fileSize)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(note.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t">
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={note.fileName}
                          className="w-full inline-flex items-center justify-center rounded-xl text-xs font-semibold h-9 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-md shadow-blue-500/20 transition-all gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download / Open Material
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
