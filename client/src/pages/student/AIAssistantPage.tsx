import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { geminiApi } from '@/api/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bot, Send, BookOpen, Brain, Trophy, Lightbulb, Clock, Sparkles, Loader2,
  MessageSquare, History, Bookmark, ArrowRight, GraduationCap, Target, Heart, Users, Code,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickActions = [
  { label: 'Study Plan', icon: BookOpen, prompt: 'Create a personalized study plan for my upcoming exams', color: 'from-blue-500 to-cyan-400' },
  { label: 'Revision Tips', icon: Brain, prompt: 'Give me revision tips for my weak subjects', color: 'from-violet-500 to-purple-400' },
  { label: 'Career Advice', icon: Trophy, prompt: 'What career opportunities are available in my field?', color: 'from-amber-500 to-orange-400' },
  { label: 'Time Management', icon: Clock, prompt: 'How can I better manage my study time during free periods?', color: 'from-emerald-500 to-teal-400' },
  { label: 'Motivation', icon: Sparkles, prompt: 'I am feeling unmotivated. Give me some encouragement and practical tips.', color: 'from-rose-500 to-pink-400' },
  { label: 'Practice Questions', icon: Target, prompt: 'Give me some practice questions for my subjects', color: 'from-indigo-500 to-blue-400' },
];

const categoryIcons: Record<string, any> = {
  book: BookOpen, code: Code, brain: Brain, heart: Heart, users: Users, trophy: Trophy,
  study: BookOpen, practice: Code, career: Trophy, health: Heart, social: Users,
};

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'activities' | 'history'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (message: string) => geminiApi.chat(message).then(r => r.data.data),
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: (data as any)?.response || 'I couldn\'t generate a response. Please try again.',
        timestamp: new Date(),
      }]);
    },
    onError: (err: any) => {
      const serverMsg = err.response?.data?.message || err.message || 'Check your Gemini API key in backend/.env';
      toast.error(serverMsg);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ ${serverMsg}`,
        timestamp: new Date(),
      }]);
    },
  });

  // Activity recommendations mutation
  const activityMutation = useMutation({
    mutationFn: (minutes: number) => geminiApi.getActivityRecommendations(minutes).then(r => r.data.data),
  });

  // History query
  const { data: historyData } = useQuery({
    queryKey: ['gemini-history'],
    queryFn: () => geminiApi.getHistory({ limit: '20' }).then(r => r.data.data),
    enabled: activeTab === 'history',
  });

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    chatMutation.mutate(inputValue.trim());
    setInputValue('');
  };

  const handleQuickAction = (prompt: string) => {
    setActiveTab('chat');
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    chatMutation.mutate(prompt);
  };

  const handleGetActivities = () => {
    activityMutation.mutate(45);
  };

  let parsedActivities: any = null;
  if (activityMutation.data) {
    try {
      const raw = (activityMutation.data as any)?.recommendations || '';
      parsedActivities = typeof raw === 'string' ? JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '')) : raw;
    } catch { /* ignore parse errors */ }
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">AI Study Buddy</h2>
            <p className="text-sm text-muted-foreground">Your personal AI academic assistant powered by Gemini</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <div className="flex gap-2">
          {[
            { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
            { id: 'activities' as const, label: 'Activities', icon: Lightbulb },
            { id: 'history' as const, label: 'History', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-secondary text-muted-foreground hover:bg-accent'
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <>
          {/* Quick Actions */}
          {messages.length === 0 && (
            <motion.div variants={item}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="text-left group"
                  >
                    <Card className="border-0 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                      <CardContent className="p-4">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <action.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-semibold text-sm">{action.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{action.prompt}</p>
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Chat Messages */}
          {messages.length > 0 && (
            <motion.div variants={item}>
              <Card className="border-0 rounded-2xl shadow-lg">
                <CardContent className="p-4 max-h-[500px] overflow-y-auto space-y-4">
                  <AnimatePresence mode="popLayout">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-br-md'
                            : 'bg-secondary rounded-bl-md'
                        }`}>
                          {msg.content}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 mt-1">
                            <GraduationCap className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {chatMutation.isPending && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Input */}
          <motion.div variants={item}>
            <div className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask me anything about your studies, career, or time management..."
                className="flex-1 h-12 rounded-xl border-0 bg-secondary/50 text-sm"
                disabled={chatMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || chatMutation.isPending}
                className="h-12 px-5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg shadow-violet-500/20"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </>
      )}

      {/* Activities Tab */}
      {activeTab === 'activities' && (
        <motion.div variants={item} className="space-y-5">
          <Card className="border-0 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Free Period Recommendations</h3>
                  <p className="text-sm text-muted-foreground mt-1">Get personalized activity suggestions for your free time</p>
                </div>
                <Button
                  onClick={handleGetActivities}
                  disabled={activityMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg"
                >
                  {activityMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate
                </Button>
              </div>
            </CardContent>
          </Card>

          {activityMutation.isPending && (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
          )}

          {parsedActivities?.recommendations && (
            <div className="space-y-3">
              {parsedActivities.recommendations.map((rec: any, idx: number) => {
                const IconComponent = categoryIcons[rec.icon] || categoryIcons[rec.category] || Lightbulb;
                const gradients = ['from-blue-500 to-cyan-400', 'from-emerald-500 to-teal-400', 'from-violet-500 to-purple-400', 'from-amber-500 to-orange-400', 'from-rose-500 to-pink-400', 'from-indigo-500 to-blue-400'];
                return (
                  <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
                    <Card className="border-0 rounded-2xl shadow-md hover:shadow-lg transition-all">
                      <CardContent className="p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[idx % gradients.length]} flex items-center justify-center flex-shrink-0 shadow-md`}>
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm">{rec.title}</p>
                            <Badge className={`text-[10px] border-0 capitalize ${
                              rec.priority === 'high' ? 'bg-red-500/10 text-red-500' :
                              rec.priority === 'medium' ? 'bg-amber-500/10 text-amber-500' :
                              'bg-blue-500/10 text-blue-500'
                            }`}>{rec.priority}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{rec.description}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" /> {rec.duration}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}

              {parsedActivities.motivationalTip && (
                <Card className="border-0 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 shadow-md">
                  <CardContent className="p-5 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-sm font-medium">{parsedActivities.motivationalTip}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <motion.div variants={item} className="space-y-3">
          {(historyData as any)?.items?.length > 0 ? (
            (historyData as any).items.map((h: any) => (
              <Card key={h.id} className="border-0 rounded-2xl shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className="text-[10px] capitalize">{h.type?.replace('_', ' ')}</Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(h.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium mb-1">{h.prompt}</p>
                  <p className="text-xs text-muted-foreground line-clamp-3">{h.response?.slice(0, 200)}...</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-0 rounded-2xl shadow-lg">
              <CardContent className="py-16 text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">No history yet</p>
                <p className="text-sm text-muted-foreground mt-1">Start a conversation to see your history here</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
