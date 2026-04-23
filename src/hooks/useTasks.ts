'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api-client';
import { ITask } from '@/models/Task';

export function useTasks(options: { status?: string; leadId?: string } = {}) {
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (options.status) query.append('status', options.status);
      if (options.leadId) query.append('leadId', options.leadId);

      const data = await api.get<{ tasks: ITask[] }>(`/tasks?${query.toString()}`);
      setTasks(data.tasks);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [options.status, options.leadId]);

  const updateTask = async (id: string, updates: Partial<ITask>) => {
    try {
      await api.patch(`/tasks/${id}`, updates);
      setTasks(prev => prev.map(t => (t._id.toString() === id ? { ...t, ...updates } : t)));
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update task');
    }
  };

  const completeTask = (id: string) => updateTask(id, { status: 'completed', completedAt: new Date() });

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refresh: fetchTasks, updateTask, completeTask };
}
