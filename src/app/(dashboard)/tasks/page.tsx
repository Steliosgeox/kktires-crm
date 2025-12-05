'use client';

import { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Filter,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { GlassInput } from '@/components/ui/glass-input';
import { GlassBadge } from '@/components/ui/glass-badge';
import { GlassTabs, GlassTabsList, GlassTabsTrigger, GlassTabsContent } from '@/components/ui/glass-tabs';
import { GlassSkeleton } from '@/components/ui/glass-skeleton';
import { cn, getTaskPriorityLabel, getTaskStatusLabel } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  customerName: string | null;
  customerCompany: string | null;
}

interface TaskCounts {
  todo: number;
  in_progress: number;
  done: number;
  overdue: number;
}

const priorityColors = {
  low: 'text-emerald-400',
  medium: 'text-amber-400',
  high: 'text-red-400',
};

const statusIcons = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle,
};

function TaskItem({ task }: { task: Task }) {
  const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || Circle;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-xl border border-white/[0.05] p-4 transition-colors hover:bg-white/[0.02]',
        { 'border-red-500/30 bg-red-500/5': isOverdue }
      )}
    >
      <button className="mt-0.5">
        <StatusIcon
          className={cn('h-5 w-5', {
            'text-white/30': task.status === 'todo',
            'text-cyan-400': task.status === 'in_progress',
            'text-emerald-400': task.status === 'done',
          })}
        />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3
              className={cn('font-medium text-white', {
                'line-through text-white/50': task.status === 'done',
              })}
            >
              {task.title}
            </h3>
            {task.description && (
              <p className="text-sm text-white/50 mt-1">{task.description}</p>
            )}
          </div>
          <GlassBadge
            size="sm"
            className={priorityColors[task.priority as keyof typeof priorityColors]}
          >
            {getTaskPriorityLabel(task.priority)}
          </GlassBadge>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
          {task.customerName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3" />
              {task.customerName} {task.customerCompany && `(${task.customerCompany})`}
            </div>
          )}
          {task.dueDate && (
            <div className={cn('flex items-center gap-1.5', { 'text-red-400': isOverdue })}>
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString('el-GR')}
              {isOverdue && <AlertCircle className="h-3 w-3" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [counts, setCounts] = useState<TaskCounts>({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
        setCounts(data.counts || { todo: 0, in_progress: 0, done: 0, overdue: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const doneTasks = filteredTasks.filter((t) => t.status === 'done');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Εργασίες</h1>
          <p className="text-white/60">
            Διαχείριση εργασιών και υπενθυμίσεων ({tasks.length} σύνολο)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlassButton variant="ghost" onClick={fetchTasks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Ανανέωση
          </GlassButton>
          <GlassButton variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
            Νέα Εργασία
          </GlassButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05]">
              <Circle className="h-5 w-5 text-white/40" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{loading ? '...' : counts.todo}</p>
              <p className="text-xs text-white/50">Προς Υλοποίηση</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
              <Clock className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{loading ? '...' : counts.in_progress}</p>
              <p className="text-xs text-white/50">Σε Εξέλιξη</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{loading ? '...' : counts.done}</p>
              <p className="text-xs text-white/50">Ολοκληρωμένες</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{loading ? '...' : counts.overdue}</p>
              <p className="text-xs text-white/50">Εκπρόθεσμες</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1">
          <GlassInput
            placeholder="Αναζήτηση εργασιών..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<CheckSquare className="h-4 w-4" />}
          />
        </div>
        <GlassButton variant="default" leftIcon={<Filter className="h-4 w-4" />}>
          Φίλτρα
        </GlassButton>
      </div>

      {/* Tasks Tabs */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <GlassSkeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <GlassTabs defaultValue="all">
          <GlassTabsList>
            <GlassTabsTrigger value="all">Όλες ({filteredTasks.length})</GlassTabsTrigger>
            <GlassTabsTrigger value="todo">Προς Υλοποίηση ({todoTasks.length})</GlassTabsTrigger>
            <GlassTabsTrigger value="in_progress">Σε Εξέλιξη ({inProgressTasks.length})</GlassTabsTrigger>
            <GlassTabsTrigger value="done">Ολοκληρωμένες ({doneTasks.length})</GlassTabsTrigger>
          </GlassTabsList>

          <GlassTabsContent value="all" className="mt-6 space-y-3">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => <TaskItem key={task.id} task={task} />)
            ) : (
              <div className="text-center py-12">
                <CheckSquare className="h-12 w-12 text-white/20 mx-auto mb-4" />
                <p className="text-white/50">Δεν υπάρχουν εργασίες ακόμα</p>
              </div>
            )}
          </GlassTabsContent>

          <GlassTabsContent value="todo" className="mt-6 space-y-3">
            {todoTasks.length > 0 ? (
              todoTasks.map((task) => <TaskItem key={task.id} task={task} />)
            ) : (
              <p className="text-white/50 text-center py-8">Καμία εργασία προς υλοποίηση</p>
            )}
          </GlassTabsContent>

          <GlassTabsContent value="in_progress" className="mt-6 space-y-3">
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map((task) => <TaskItem key={task.id} task={task} />)
            ) : (
              <p className="text-white/50 text-center py-8">Καμία εργασία σε εξέλιξη</p>
            )}
          </GlassTabsContent>

          <GlassTabsContent value="done" className="mt-6 space-y-3">
            {doneTasks.length > 0 ? (
              doneTasks.map((task) => <TaskItem key={task.id} task={task} />)
            ) : (
              <p className="text-white/50 text-center py-8">Καμία ολοκληρωμένη εργασία</p>
            )}
          </GlassTabsContent>
        </GlassTabs>
      )}
    </div>
  );
}
