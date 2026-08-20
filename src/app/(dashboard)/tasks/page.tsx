'use client';

import * as React from 'react';
import { 
  Plus, CheckCircle2, Circle, AlertCircle, ExternalLink, Lock, 
  Sun, CheckSquare, Calendar, Filter, DollarSign, FileCheck, Rocket, Bell, X, User
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader } from '@/components/layout/PageHeader';
import { api } from '@/lib/api-client';

interface LeadOption {
  _id: string;
  name: string;
  phone?: string;
  company?: string;
}

export default function TasksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as 'all' | 'sales' | 'post_sales' | 'overdue' | null;

  const { toast } = useToast();
  const { user } = useAuth();
  const { tasks, loading, updateTask, createTask } = useTasks();

  const [activeTab, setActiveTab] = React.useState<'all' | 'sales' | 'post_sales' | 'overdue'>('all');

  React.useEffect(() => {
    if (tabParam && ['all', 'sales', 'post_sales', 'overdue'].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!tabParam) {
      setActiveTab('all');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'all' | 'sales' | 'post_sales' | 'overdue') => {
    setActiveTab(tab);
    if (tab === 'all') {
      router.push('/tasks');
    } else {
      router.push(`/tasks?tab=${tab}`);
    }
  };

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [leads, setLeads] = React.useState<LeadOption[]>([]);

  // Form State
  const [title, setTitle] = React.useState('');
  const [leadId, setLeadId] = React.useState('');
  const [category, setCategory] = React.useState<'sales' | 'billing' | 'compliance' | 'handover'>('sales');
  const [priority, setPriority] = React.useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = React.useState('');

  // Fetch leads for modal dropdown
  React.useEffect(() => {
    async function loadLeads() {
      try {
        const data = await api.get<{ leads: LeadOption[] }>('/leads?limit=500');
        setLeads(data.leads || []);
      } catch (err) {
        console.error('Failed to fetch leads for task modal:', err);
      }
    }
    loadLeads();
  }, []);

  const handleToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await updateTask(id, { status: newStatus });
      toast('success', `Task marked as ${newStatus}`);
    } catch {
      toast('error', 'Failed to update task');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) {
      toast('error', 'Please provide a task title and due date');
      return;
    }

    setSubmitting(true);
    try {
      await createTask({
        title: title.trim(),
        leadId: leadId ? (leadId as any) : undefined,
        category,
        priority,
        dueDate: new Date(dueDate),
        description: description.trim(),
      });
      toast('success', 'New task created successfully!');
      setIsCreateModalOpen(false);
      // Reset form
      setTitle('');
      setLeadId('');
      setCategory('sales');
      setPriority('medium');
      setDescription('');
    } catch (err: any) {
      toast('error', err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter tasks based on tab
  const filteredTasks = React.useMemo(() => {
    return tasks.filter((t) => {
      const isCompleted = t.status === 'completed';
      const isOverdue = !isCompleted && new Date(t.dueDate) < new Date();

      if (activeTab === 'overdue') return isOverdue;
      if (activeTab === 'sales') return (t as any).category === 'sales' || !(t as any).category;
      if (activeTab === 'post_sales') return ['post_sales', 'billing', 'compliance', 'handover'].includes((t as any).category);
      return true;
    });
  }, [tasks, activeTab]);

  const pending = filteredTasks.filter((t) => t.status !== 'completed');
  const completed = filteredTasks.filter((t) => t.status === 'completed');

  // Daily Sales Agenda collation
  const todayAgenda = React.useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      if (t.status === 'completed') return false;
      const due = new Date(t.dueDate);
      const isToday = due.toDateString() === now.toDateString();
      const isOverdue = due < now;
      return isToday || isOverdue;
    });
  }, [tasks]);

  return (
    <div className="animate-fade-in space-y-6 pb-12">
      <PageHeader
        title="Tasks & Activity Automation"
        subtitle="Track sales follow-ups, post-sales billing milestones, and automated daily action items"
        action={
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <Plus size={14} /> Add Task
          </button>
        }
      />

      {/* 🌅 LIGHT BLUE 9:00 AM Daily Sales Agenda Generator Banner */}
      <div className="p-6 bg-gradient-to-r from-sky-50 via-indigo-50/70 to-blue-50 rounded-2xl border border-sky-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Sun size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-sky-950">Today's Sales Focus Agenda</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-sky-100 text-sky-800 border border-sky-200">
                  9:00 AM Auto-Generated
                </span>
              </div>
              <p className="text-xs text-slate-700 font-semibold">
                {todayAgenda.length > 0
                  ? `You have ${todayAgenda.length} high-priority tasks requiring your attention today.`
                  : 'Great job! You have zero pending tasks due for today.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if ('Notification' in window && Notification.permission === 'default') {
                  Notification.requestPermission();
                } else {
                  toast('success', 'Desktop Push & Audio Reminder system is active!');
                }
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5"
            >
              <Bell size={13} /> Enable Push Alerts
            </button>
          </div>
        </div>

        {/* Quick Agenda Preview Items */}
        {todayAgenda.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-sky-200/60">
            {todayAgenda.slice(0, 3).map((item) => (
              <div key={item._id.toString()} className="p-3 rounded-xl bg-white border border-sky-100 shadow-2xs flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 truncate pr-2">{item.title}</span>
                <button
                  onClick={() => handleToggle(item._id.toString(), item.status)}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] shrink-0 transition-all shadow-2xs"
                >
                  ✓ Done
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Navigation Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => handleTabChange('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'all'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckSquare size={15} /> All Tasks ({tasks.length})
        </button>

        <button
          onClick={() => handleTabChange('sales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'sales'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Calendar size={15} /> Sales Follow-ups
        </button>

        <button
          onClick={() => handleTabChange('post_sales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'post_sales'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <DollarSign size={15} /> Post-Sales & Billing Tasks
        </button>

        <button
          onClick={() => handleTabChange('overdue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'overdue'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertCircle size={15} /> Overdue ({tasks.filter((t) => t.status !== 'completed' && new Date(t.dueDate) < new Date()).length})
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-indigo-600 animate-spin" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 border border-slate-200 text-center space-y-3">
          <CheckCircle2 size={44} className="mx-auto text-emerald-500 stroke-1" />
          <p className="text-sm font-bold text-slate-700">All caught up! No tasks found in this view.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Tasks */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Pending ({pending.length})
              </p>
              <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-xs">
                {pending.map((t) => (
                  <TaskRow key={t._id.toString()} task={t} userId={user?.id} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completed.length > 0 && (
            <div className="space-y-3 opacity-70">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Completed ({completed.length})
              </p>
              <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-xs opacity-60">
                {completed.map((t) => (
                  <TaskRow key={t._id.toString()} task={t} userId={user?.id} onToggle={handleToggle} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE TASK MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <CheckSquare size={18} />
                </div>
                <h2 className="text-base font-bold text-slate-900">Create New Task</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Task Title */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Follow-up call with client regarding proposal"
                  className="w-full h-10 px-3.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Task Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
                  >
                    <option value="sales">Sales Follow-up</option>
                    <option value="billing">Post-Sales Billing</option>
                    <option value="compliance">Legal Compliance</option>
                    <option value="handover">Go-Live Handover</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Associated Lead */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Assign Client / Lead</label>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
                  >
                    <option value="">No Lead Assigned</option>
                    {leads.map((l) => (
                      <option key={l._id} value={l._id}>{l.name} {l.company ? `(${l.company})` : ''}</option>
                    ))}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Notes / Instructions</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details or agenda for this task..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs font-bold px-5 py-2.5 shadow-md flex items-center gap-1.5"
                >
                  {submitting ? 'Saving...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
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

  const category = task.category || 'sales';

  return (
    <div className="flex items-center gap-4 p-4 sm:px-6 sm:py-4 transition-colors hover:bg-slate-50/80">
      {/* Toggle */}
      <button
        onClick={() => canComplete && onToggle(task._id.toString(), task.status)}
        disabled={!canComplete}
        className="shrink-0 transition-transform active:scale-90"
        style={{ cursor: canComplete ? 'pointer' : 'not-allowed' }}
      >
        {isCompleted ? (
          <CheckCircle2 size={22} className="text-emerald-500" />
        ) : canComplete ? (
          <Circle size={22} className="text-slate-300 hover:text-indigo-600" />
        ) : (
          <Lock size={16} className="text-slate-300" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`text-sm font-semibold ${
              isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
            }`}
          >
            {task.title}
          </p>

          {/* Category Pill */}
          {category !== 'sales' && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              {category}
            </span>
          )}

          {/* Priority Pill */}
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0"
            style={{ ...ps }}
          >
            {task.priority}
          </span>
        </div>

        <div className="flex items-center gap-4 mt-1 flex-wrap text-xs">
          <span
            className={`flex items-center gap-1 font-semibold ${
              isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
            }`}
          >
            {isOverdue && <AlertCircle size={12} />}
            Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>

          {task.leadId?.name && (
            <span className="text-slate-500 font-medium">
              Client: <strong className="text-indigo-700 font-bold">{task.leadId.name}</strong>
            </span>
          )}

          {task.link && (
            <a
              href={task.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-bold text-indigo-600 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Join Link <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>

      {/* Assignee Avatar */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 text-white flex items-center justify-center text-xs font-bold uppercase shadow-2xs"
          title={task.assignedTo?.name}
        >
          {task.assignedTo?.name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>
      </div>
    </div>
  );
}
