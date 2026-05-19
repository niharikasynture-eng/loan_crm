'use client';

import * as React from 'react';
import { Plus, CheckCircle2, Circle, AlertCircle, ExternalLink, Lock } from 'lucide-react';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';

export default function TasksPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tasks, loading, updateTask } = useTasks();

  const handleToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(id, { status: newStatus });
      toast('success', `Task marked as ${newStatus}`);
    } catch {
      toast('error', 'Failed to update task');
    }
  };

  const pending = tasks.filter(t => t.status !== 'completed');
  const completed = tasks.filter(t => t.status === 'completed');

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <PageHeader
        title="Tasks"
        subtitle="Track and manage your follow-ups and sales activities"
        action={
          <button className="btn-primary" style={{ fontSize: '14px' }}>
            <Plus size={15} /> Add Task
          </button>
        }
      />

      {loading ? (
        <div className="card" style={{ padding: '80px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }}
          />
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="card"
          style={{ padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', color: 'var(--text-muted)' }}
        >
          <CheckCircle2 size={40} strokeWidth={1.2} />
          <p style={{ fontSize: '14px', fontWeight: 500 }}>All caught up! No tasks found.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <p className="mb-3" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Pending ({pending.length})
              </p>
              <div className="flex flex-col gap-4">
                {pending.map(task => <TaskRow key={task._id.toString()} task={task} userId={user?.id} onToggle={handleToggle} />)}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div style={{ opacity: 0.7 }}>
              <p className="mb-3" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Completed ({completed.length})
              </p>
              <div className="flex flex-col gap-4 opacity-60">
                {completed.map(task => <TaskRow key={task._id.toString()} task={task} userId={user?.id} onToggle={handleToggle} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, userId, onToggle }: { task: any; userId?: string; onToggle: (id: string, status: string) => void }) {
  const isCompleted = task.status === 'completed';
  const isOverdue = !isCompleted && new Date(task.dueDate) < new Date();
  const canComplete = task.assignedTo?._id === userId || task.assignedTo === userId;

  const PRIORITY_STYLE: Record<string, { bg: string; color: string }> = {
    high: { bg: '#fef2f2', color: '#dc2626' },
    medium: { bg: '#fffbeb', color: '#d97706' },
    low: { bg: '#eff6ff', color: '#2563eb' },
  };
  const ps = PRIORITY_STYLE[task.priority?.toLowerCase()] ?? PRIORITY_STYLE.medium;

  return (
    <div className="flex items-center gap-4 p-4 sm:px-6 sm:py-5 border-b border-gray-100 transition-colors hover:bg-gray-50/80 rounded-2xl">
      {/* Toggle */}
      <button
        onClick={() => canComplete && onToggle(task._id.toString(), task.status)}
        disabled={!canComplete}
        className="shrink-0 transition-transform"
        style={{ cursor: canComplete ? 'pointer' : 'not-allowed' }}
      >
        {isCompleted
          ? <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
          : canComplete
            ? <Circle size={20} style={{ color: 'var(--border-strong)' }} />
            : <Lock size={16} style={{ color: 'var(--text-disabled)' }} />
        }
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: isCompleted ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </p>
          <span
            className="px-2 py-0.5 rounded-full shrink-0"
            style={{ fontSize: '12px', fontWeight: 600, ...ps }}
          >
            {task.priority}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-0.5 flex-wrap">
          <span
            className="flex items-center gap-1"
            style={{ fontSize: '13px', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            {isOverdue && <AlertCircle size={11} />}
            Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          {task.leadId?.name && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Lead: <span style={{ color: 'var(--brand)' }}>{task.leadId.name}</span>
            </span>
          )}
          {task.link && (
            <a
              href={task.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
              style={{ fontSize: '13px', color: 'var(--brand)' }}
              onClick={e => e.stopPropagation()}
            >
              Join Meeting <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>

      {/* Assignee */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'var(--brand)' }}
          title={task.assignedTo?.name}
        >
          {task.assignedTo?.name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
      </div>
    </div>
  );
}
