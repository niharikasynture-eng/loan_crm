'use client';

import * as React from 'react';
import { CheckCircle2, Circle, AlertCircle, ExternalLink, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ITask } from '@/models/Task';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';

interface TaskListProps {
  tasks: ITask[];
  loading: boolean;
  onToggleComplete: (id: string, currentStatus: string) => void;
}

export function TaskList({ tasks, loading, onToggleComplete }: TaskListProps) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Spinner size="lg" />
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Retrieving assignments...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="py-20 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-200">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
          <p className="text-sm text-gray-500 font-medium">No pending tasks found for your account.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {tasks.map((task) => {
        const isCompleted = task.status === 'completed';
        const isOverdue = !isCompleted && new Date(task.dueDate) < new Date();
        const canComplete = (task as any).assignedTo?._id === user?.id || (task as any).assignedTo === user?.id;

        return (
          <Card
            key={task._id.toString()}
            padding="none"
            className={cn(
              "transition-all duration-300",
              isCompleted ? "opacity-50 grayscale" : "hover:shadow-md border-gray-100"
            )}
          >
            <div className="p-5 flex items-start gap-4">
              {/* Status Toggle */}
              <button
                onClick={() => canComplete && onToggleComplete(task._id.toString(), task.status)}
                disabled={!canComplete}
                className={cn(
                  "mt-1 p-1 rounded-full transition-all shrink-0",
                  canComplete ? "hover:scale-110 active:scale-90" : "cursor-not-allowed opacity-30"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="text-success-500" size={24} />
                ) : canComplete ? (
                  <Circle className="text-gray-300" size={24} />
                ) : (
                  <Lock className="text-gray-400" size={20} />
                )}
              </button>

              {/* Task Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h4 className={cn(
                    "text-base font-bold tracking-tight truncate",
                    isCompleted ? "text-gray-400 line-through" : "text-gray-900"
                  )}>
                    {task.title}
                  </h4>
                  <Badge variant={task.priority.toLowerCase() === 'high' ? 'danger' : task.priority.toLowerCase() === 'medium' ? 'warning' : 'info'}>
                    {task.priority}
                  </Badge>
                </div>

                <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest">
                  <span className={cn(
                    "flex items-center gap-1.5",
                    isOverdue ? "text-danger-600" : "text-gray-400"
                  )}>
                    {isOverdue && <AlertCircle size={12} />}
                    Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>

                  {task.leadId && (
                    <span className="text-gray-400">
                      Lead: <span className="text-gray-900">{(task as any).leadId?.name || 'Unknown'}</span>
                    </span>
                  )}

                  {task.link && (
                    <a
                      href={task.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors"
                    >
                      Action Details <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-50">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-gray-900 tracking-tight">
                    {(task as any).assignedTo?.name || 'Unassigned'}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Assignee.</p>
                </div>
                <Avatar
                  name={(task as any).assignedTo?.name || '?'}
                  src={(task as any).assignedTo?.avatar}
                  size="sm"
                />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
