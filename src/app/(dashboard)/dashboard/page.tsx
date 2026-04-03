'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Users, TrendingUp, PhoneCall, CheckSquare, Link2, Copy, CheckCircle, ArrowUpRight } from 'lucide-react';

interface DashboardMetrics {
  totalLeads: number; newLeads: number; wonLeads: number; lostLeads: number;
  totalDeals: number; wonDeals: number; wonDealValue: number;
  totalActivities: number; callsThisMonth: number; pendingTasks: number; conversionRate: number;
}
interface Activity {
  _id: string; type: string; notes: string; createdAt: string;
  createdBy: { name: string; avatar?: string }; leadId: { name: string };
}
interface Task {
  _id: string; title: string; dueDate: string; priority: string;
  assignedTo: { name: string; avatar?: string }; leadId?: { name: string };
}

const TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  email:    { bg: 'bg-blue-50',   text: 'text-blue-600',   dot: 'bg-blue-500' },
  call:     { bg: 'bg-emerald-50',text: 'text-emerald-600',dot: 'bg-emerald-500' },
  whatsapp: { bg: 'bg-green-50',  text: 'text-green-600',  dot: 'bg-green-500' },
  note:     { bg: 'bg-amber-50',  text: 'text-amber-600',  dot: 'bg-amber-500' },
  meeting:  { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
};

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
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  const metricCards = [
    { label: 'Total Leads',   value: metrics?.totalLeads,    sub: `${metrics?.newLeads ?? 0} new this period`,        subColor: 'text-emerald-600', icon: Users,       iconBg: 'bg-blue-50',   iconColor: 'text-blue-600' },
    { label: 'Won Deals',     value: metrics?.wonDeals,       sub: `$${(metrics?.wonDealValue ?? 0).toLocaleString()} total value`, subColor: 'text-emerald-600', icon: TrendingUp,  iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
    { label: 'Calls (30d)',   value: metrics?.callsThisMonth, sub: `${metrics?.totalActivities ?? 0} total activities`, subColor: 'text-gray-400',   icon: PhoneCall,   iconBg: 'bg-sky-50',    iconColor: 'text-sky-600' },
    { label: 'Pending Tasks', value: metrics?.pendingTasks,   sub: 'Requires your attention',                           subColor: 'text-amber-500',  icon: CheckSquare, iconBg: 'bg-amber-50',  iconColor: 'text-amber-600' },
  ];

  return (
    <div className="max-w-screen-xl mx-auto space-y-8 pb-12">

      {/* Public Lead Form Banner */}
      {(user?.role === 'org_admin' || user?.role === 'manager') && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Link2 size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Public Lead Capture Form</p>
              <p className="text-xs text-gray-500 mt-0.5">Share this link to capture leads automatically into your CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <code className="flex-1 sm:flex-none bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-indigo-600 font-mono truncate max-w-xs">
              {publicLeadUrl}
            </code>
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all flex-shrink-0 ${copied ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map(({ label, value, sub, subColor, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            {/* Top row: label + icon */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
              <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <Icon size={18} className={iconColor} />
              </div>
            </div>
            {/* Number */}
            <p className="text-4xl font-black text-gray-900 leading-none mb-2">{value ?? 0}</p>
            {/* Sub */}
            <p className={`text-xs font-semibold ${subColor}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Bottom Panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
            {activities.length > 0 && (
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                {activities.length} events
              </span>
            )}
          </div>

          {/* List */}
          <div className="divide-y divide-gray-100">
            {activities.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400">No recent activity yet.</p>
              </div>
            ) : activities.map((act) => {
              const t = TYPE_COLORS[act.type?.toLowerCase()] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
              return (
                <div key={act._id} className="flex items-start gap-5 px-6 py-5 hover:bg-gray-50 transition-colors">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-sm font-black flex-shrink-0 shadow-sm">
                    {act.createdBy?.name?.charAt(0).toUpperCase()}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Name + badge + lead */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-sm font-bold text-gray-900">{act.createdBy?.name}</span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${t.bg} ${t.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dot} flex-shrink-0`} />
                        {act.type?.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">to</span>
                      <span className="text-sm font-semibold text-gray-800">{act.leadId?.name}</span>
                    </div>
                    {/* Notes */}
                    {act.notes && (
                      <p className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 italic leading-relaxed mb-2">
                        &ldquo;{act.notes}&rdquo;
                      </p>
                    )}
                    {/* Timestamp */}
                    <p className="text-xs text-gray-400">{new Date(act.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Upcoming Tasks</h2>
            {tasks.length > 0 && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                {tasks.length} pending
              </span>
            )}
          </div>

          {/* List */}
          <div className="divide-y divide-gray-50">
            {tasks.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400">No upcoming tasks. All clear!</p>
              </div>
            ) : tasks.map((task) => {
              const priorityDot = task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-gray-300';
              const priorityLabel = task.priority === 'high' ? 'text-red-600 bg-red-50' : task.priority === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-100';
              return (
                <div key={task._id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${priorityDot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{task.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">Due {new Date(task.dueDate).toLocaleDateString()}</span>
                      {task.leadId && <span className="text-xs font-medium text-indigo-500 truncate">{task.leadId.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md capitalize ${priorityLabel}`}>{task.priority}</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white" title={task.assignedTo?.name}>
                      {task.assignedTo?.name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
