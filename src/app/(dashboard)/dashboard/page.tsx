'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Users, TrendingUp, PhoneCall, CheckSquare, Link2, Copy, CheckCircle } from 'lucide-react';

interface DashboardMetrics {
  totalLeads: number;
  newLeads: number;
  wonLeads: number;
  lostLeads: number;
  totalDeals: number;
  wonDeals: number;
  wonDealValue: number;
  totalActivities: number;
  callsThisMonth: number;
  pendingTasks: number;
  conversionRate: number;
}

interface Activity {
  _id: string;
  type: string;
  notes: string;
  createdAt: string;
  createdBy: { name: string; avatar?: string };
  leadId: { name: string };
}

interface Task {
  _id: string;
  title: string;
  dueDate: string;
  priority: string;
  assignedTo: { name: string; avatar?: string };
  leadId?: { name: string };
}

export default function DashboardPage() {
  const { user, organization } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const publicLeadUrl = typeof window !== 'undefined' && user?.role !== 'super_admin'
    ? `${window.location.protocol}//${window.location.host}/form/${organization?.slug || 'org'}`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicLeadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<{ metrics: DashboardMetrics; recentActivities: Activity[]; upcomingTasks: Task[] }>('/dashboard');
        setMetrics(data.metrics);
        setActivities(data.recentActivities);
        setTasks(data.upcomingTasks);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8 text-[#94a3b8]">Loading dashboard...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-[#94a3b8] mt-1">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* Public Lead Form Card — for Admin/Manager */}
      {(user?.role === 'org_admin' || user?.role === 'manager') && (
        <div className="bg-gradient-to-r from-indigo-500/10 to-sky-500/10 border border-indigo-500/20 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-white font-bold">Public Lead Form</h3>
              <p className="text-[#94a3b8] text-sm">Share this link to capture leads automatically</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <code className="bg-[#0f172a] px-4 py-2 rounded-lg border border-[#334155] text-indigo-300 text-sm font-mono flex-1 md:flex-none truncate max-w-xs md:max-w-md">
              {publicLeadUrl}
            </code>
            <button 
              onClick={copyToClipboard}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                copied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#94a3b8]">Total Leads</p>
              <h3 className="text-3xl font-bold text-white mt-1">{metrics?.totalLeads}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm mt-4 text-[#10b981]">
            {metrics?.newLeads} new
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#94a3b8]">Won Deals</p>
              <h3 className="text-3xl font-bold text-white mt-1">{metrics?.wonDeals}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm mt-4 text-[#10b981]">
            ${metrics?.wonDealValue.toLocaleString()} value
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#94a3b8]">Calls (30d)</p>
              <h3 className="text-3xl font-bold text-white mt-1">{metrics?.callsThisMonth}</h3>
            </div>
            <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm mt-4 text-[#64748b]">
            Total {metrics?.totalActivities} activities
          </p>
        </div>

        <div className="metric-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[#94a3b8]">Pending Tasks</p>
              <h3 className="text-3xl font-bold text-white mt-1">{metrics?.pendingTasks}</h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-sm mt-4 text-[#64748b]">
            Requires attention
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Recent Activity */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-sm text-[#64748b]">No recent activities.</p>
            ) : (
              activities.map((act) => (
                <div key={act._id} className="flex gap-4 p-3 rounded-lg hover:bg-[#0f172a] transition-colors border border-transparent hover:border-[#334155]">
                  <div className="w-10 h-10 rounded-full bg-[#334155] flex-shrink-0 flex items-center justify-center text-xs font-bold text-[#e2e8f0]">
                    {act.createdBy?.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-[#cbd5e1]">
                      <span className="font-semibold text-white">{act.createdBy?.name}</span> logged a {act.type} for <span className="font-semibold text-white">{act.leadId?.name}</span>
                    </p>
                    <p className="text-xs text-[#64748b] mt-1">{new Date(act.createdAt).toLocaleString()}</p>
                    {act.notes && <p className="text-sm text-[#94a3b8] mt-2 italic">&quot;{act.notes}&quot;</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="card p-6">
          <h3 className="text-lg font-bold text-white mb-4">Upcoming Tasks</h3>
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <p className="text-sm text-[#64748b]">No pending tasks.</p>
            ) : (
              tasks.map((task) => (
                <div key={task._id} className="flex items-center justify-between p-3 rounded-lg border border-[#334155] bg-[#0f172a]">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{
                      backgroundColor: task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#3b82f6'
                    }} />
                    <div>
                      <p className="text-sm font-medium text-white">{task.title}</p>
                      <p className="text-xs text-[#64748b] mt-0.5">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                        {task.leadId && ` • Lead: ${task.leadId.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex -space-x-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-500 border border-[#0f172a] flex items-center justify-center text-[10px] text-white font-bold" title={task.assignedTo?.name}>
                      {task.assignedTo?.name?.charAt(0)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
