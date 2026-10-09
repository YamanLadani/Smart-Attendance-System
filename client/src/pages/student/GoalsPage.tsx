import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Plus, CheckCircle2, Circle, Calendar, Flame, Trophy } from 'lucide-react';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export default function GoalsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({ type: 'daily' as string, title: '', description: '' });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['student-goals'],
    queryFn: () => studentApi.getGoals().then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (goalData: Record<string, unknown>) => studentApi.createGoal(goalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-goals'] });
      setShowCreate(false);
      setNewGoal({ type: 'daily', title: '', description: '' });
      toast.success('Goal created! 🎯');
    },
    onError: () => toast.error('Failed to create goal'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      studentApi.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-goals'] });
      toast.success('Goal updated!');
    },
  });

  const handleCreate = () => {
    if (!newGoal.title.trim()) {
      toast.error('Goal title is required');
      return;
    }
    createMutation.mutate(newGoal);
  };

  const toggleComplete = (id: string, isCompleted: boolean) => {
    updateMutation.mutate({ id, data: { isCompleted: !isCompleted } });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  const goals = data?.goals || [];
  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);

  const typeConfig = {
    daily: { emoji: '🌅', color: 'bg-blue-500/10 text-blue-500', label: 'Daily' },
    weekly: { emoji: '📅', color: 'bg-purple-500/10 text-purple-500', label: 'Weekly' },
    career: { emoji: '🚀', color: 'bg-amber-500/10 text-amber-600', label: 'Career' },
  } as const;

  const renderGoal = (goal: typeof goals[0]) => {
    const config = typeConfig[goal.type as keyof typeof typeConfig] || typeConfig.daily;
    return (
      <motion.div key={goal.id} variants={item}>
        <Card className={`border-0 rounded-2xl shadow-lg card-hover ${goal.isCompleted ? 'opacity-60' : ''}`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <button
                onClick={() => toggleComplete(goal.id, goal.isCompleted)}
                className="mt-0.5 shrink-0 group"
              >
                {goal.isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 group-hover:border-primary transition-colors" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`font-semibold text-sm ${goal.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {goal.title}
                  </p>
                  <Badge variant="secondary" className={`text-[10px] font-semibold px-2 py-0 ${config.color}`}>
                    {config.emoji} {config.label}
                  </Badge>
                </div>
                {goal.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
                  <span>{format(new Date(goal.createdAt), 'dd MMM yyyy')}</span>
                  {goal.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due: {format(new Date(goal.dueDate), 'dd MMM')}
                    </span>
                  )}
                </div>
                {goal.tasks && goal.tasks.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {goal.tasks.map((task, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {task.isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />
                        )}
                        <span className={task.isCompleted ? 'line-through text-muted-foreground' : ''}>
                          {task.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-7">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">My Goals</h2>
            <p className="text-xs text-muted-foreground">{activeGoals.length} active, {completedGoals.length} completed</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/20 rounded-xl"
        >
          <Plus className="mr-2 h-4 w-4" /> New Goal
        </Button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="active">
          <TabsList className="rounded-xl bg-secondary/50 p-1">
            <TabsTrigger value="active" className="rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Flame className="w-4 h-4" /> Active ({activeGoals.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Trophy className="w-4 h-4" /> Completed ({completedGoals.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="space-y-3 mt-5">
            {activeGoals.length > 0 ? (
              activeGoals.map(renderGoal)
            ) : (
              <Card className="border-0 rounded-2xl shadow-lg">
                <CardContent className="py-16 text-center">
                  <Target className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground font-medium">No active goals</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">Create one to get started!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="completed" className="space-y-3 mt-5">
            {completedGoals.length > 0 ? (
              completedGoals.map(renderGoal)
            ) : (
              <Card className="border-0 rounded-2xl shadow-lg">
                <CardContent className="py-16 text-center">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">No completed goals yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Create New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Type</Label>
              <Select value={newGoal.type} onValueChange={(v) => setNewGoal({ ...newGoal, type: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">🌅 Daily</SelectItem>
                  <SelectItem value="weekly">📅 Weekly</SelectItem>
                  <SelectItem value="career">🚀 Career</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Title *</Label>
              <Input placeholder="e.g., Study 2 hours for DBMS" value={newGoal.title} onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Description</Label>
              <Textarea placeholder="Optional details..." value={newGoal.description} onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
              {createMutation.isPending ? 'Creating...' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
