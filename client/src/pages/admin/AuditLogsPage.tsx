import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShieldCheck, Loader2, User, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { AuditLog } from '@/types';

export default function AuditLogsPage() {
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filterAction, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: '30' };
      if (filterAction && filterAction !== 'all') params.action = filterAction;
      const res = await adminApi.getAuditLogs(params);
      return res.data.data;
    },
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination as any;

  const actionColor = (action: string) => {
    if (action.includes('created')) return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (action.includes('updated') || action.includes('corrected')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (action.includes('deleted') || action.includes('removed') || action.includes('deactivated')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (action.includes('login') || action.includes('activated')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  };

  const actionLabel = (action: string) => action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' +
      date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-sm text-white/50 mt-1">System activity trail — {pagination?.total || 0} records</p>
        </div>
        <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(1); }}>
          <SelectTrigger className="w-[200px] bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {['user_created', 'admin_created', 'attendance_marked', 'attendance_corrected',
              'subject_created', 'subject_updated', 'enrollment_created', 'enrollment_removed',
              'session_created', 'setting_updated'].map(a => (
              <SelectItem key={a} value={a}>{actionLabel(a)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Logs */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>
      ) : logs.length === 0 ? (
        <Card className="bg-white/[0.03] border-white/[0.06]">
          <CardContent className="py-16 text-center">
            <ShieldCheck className="w-12 h-12 mx-auto mb-4 text-white/20" />
            <p className="text-white/40">No audit logs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log: AuditLog, i: number) => (
            <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}>
              <Card className="bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <ShieldCheck className="w-4 h-4 text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={actionColor(log.action)}>
                        {actionLabel(log.action)}
                      </Badge>
                      {log.targetType && (
                        <span className="text-[10px] text-white/30 uppercase">{log.targetType}</span>
                      )}
                    </div>
                    <p className="text-sm text-white/80">{log.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{log.userName || 'System'}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(log.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs text-white/50 bg-white/5 hover:bg-white/10 disabled:opacity-30">Prev</button>
          <span className="text-xs text-white/40">Page {page} of {pagination.pages}</span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
            className="px-3 py-1.5 rounded-lg text-xs text-white/50 bg-white/5 hover:bg-white/10 disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
