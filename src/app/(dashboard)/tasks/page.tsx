'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { CheckCircle2, Circle, AlertCircle, Plus } from 'lucide-react';

interface Task {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  assignedTo: { name: string; avatar?: string };
  leadId?: { name: string };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadTasks() {
    setLoading(true);
    try {
      const data = await api.get<{ tasks: Task[] }>('/tasks');
      setTasks(data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function toggleComplete(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    // Optimistic
    setTasks(tasks.map(t => t._id === id ? { ...t, status: newStatus } : t));
    try {
      await api.patch(`/tasks/${id}`, { status: newStatus });
    } catch {
      loadTasks(); // revert
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/30';
      case 'medium': return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-[#94a3b8] mt-1 text-sm">Keep track of your follow-ups and to-dos</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Task
        </button>
      </div>

      <div className="card divide-y divide-[#334155]">
        {loading ? (
          <div className="p-8 text-center text-[#64748b]">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#334155]">
              <CheckCircle2 className="w-6 h-6 text-[#64748b]" />
            </div>
            <h3 className="text-white font-medium mb-1">No tasks yet</h3>
            <p className="text-[#64748b] text-sm">Create tasks to stay organized and follow up with leads.</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue = task.status !== 'completed' && new Date(task.dueDate) < new Date();

            return (
              <div key={task._id} className={`p-4 flex items-center gap-4 transition-colors hover:bg-[rgba(30,41,59,0.5)] ${isCompleted ? 'opacity-60' : ''}`}>
                <button
                  onClick={() => toggleComplete(task._id, task.status)}
                  className="mt-1 flex-shrink-0 text-[#64748b] hover:text-indigo-400 transition-colors"
                >
                  {isCompleted ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Circle className="w-6 h-6" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`font-medium ${isCompleted ? 'text-[#94a3b8] line-through' : 'text-white'} truncate`}>
                      {task.title}
                    </p>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs">
                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-[#64748b]'}`}>
                      {isOverdue && <AlertCircle className="w-3 h-3" />}
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                    {task.leadId && (
                      <span className="text-[#94a3b8]">Lead: {task.leadId.name}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-xs text-right text-[#94a3b8]">
                    <p className="font-medium text-[#cbd5e1]">{task.assignedTo.name}</p>
                    <p>Assignee</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#0f172a] border border-[#334155] flex items-center justify-center text-xs font-bold text-white flex-shrink-0" title={task.assignedTo.name}>
                    {task.assignedTo.name.charAt(0)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
