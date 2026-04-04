'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Users, TrendingUp, PhoneCall, CheckSquare, Link2, Copy, CheckCircle, ArrowUpRight, Search, Bell } from 'lucide-react';

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
  email:    { bg: 'bg-indigo-50/50',  text: 'text-indigo-600',  dot: 'bg-indigo-500' },
  call:     { bg: 'bg-emerald-50/50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  whatsapp: { bg: 'bg-green-50/50',   text: 'text-green-600',   dot: 'bg-green-500' },
  note:     { bg: 'bg-orange-50/50',  text: 'text-orange-600',  dot: 'bg-orange-500' },
  meeting:  { bg: 'bg-purple-50/50',  text: 'text-purple-600',  dot: 'bg-purple-500' },
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
      <div className="w-6 h-6 border-2 border-gray-100 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  const metricCards = [
    { label: 'Total Leads',   value: metrics?.totalLeads,    sub: `${metrics?.newLeads ?? 0} new this period`,        subColor: 'text-blue-500', icon: Users,       iconBg: 'bg-blue-50/50',   iconColor: 'text-blue-600' },
    { label: 'Won Deals',     value: metrics?.wonDeals,       sub: `₹${(metrics?.wonDealValue ?? 0).toLocaleString()} total value`, subColor: 'text-emerald-500', icon: TrendingUp,  iconBg: 'bg-emerald-50/50', iconColor: 'text-emerald-600' },
    { label: 'Calls (30d)',   value: metrics?.callsThisMonth, sub: `${metrics?.totalActivities ?? 0} total activities`, subColor: 'text-gray-400',   icon: PhoneCall,   iconBg: 'bg-sky-50/50',    iconColor: 'text-sky-600' },
    { label: 'Pending Tasks', value: metrics?.pendingTasks,   sub: 'Requires your attention',                           subColor: 'text-orange-500', icon: CheckSquare, iconBg: 'bg-orange-50/50', iconColor: 'text-orange-600' },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-6 flex flex-col gap-6">

      {/* ── Dashboard Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
           <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">
             {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
           </p>
        </div>
      </div>

      {/* Public Lead Form Banner */}
      {(user?.role === 'org_admin' || user?.role === 'manager') && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600">
              <Link2 size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Public Lead Capture Form</p>
              <p className="text-[11px] font-medium text-gray-400">Capture leads automatically into your CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-[11px] text-indigo-600 font-medium font-mono truncate max-w-[200px] md:max-w-xs text-center sm:text-left">
              {publicLeadUrl}
            </div>
            <button
              onClick={copyToClipboard}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider text-white transition-all flex-shrink-0 ${copied ? 'bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map(({ label, value, sub, subColor, icon: Icon, iconBg, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:border-gray-200 transition-all group">
            <div className="flex items-center justify-between mb-6">
              <span className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
                <Icon size={18} />
              </span>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 leading-none mb-2 tabular-nums">{value ?? 0}</p>
            <p className={`text-[10px] font-bold uppercase tracking-wide ${subColor}`}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Recent Activity Section ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Recent Activity</h2>
          {activities.length > 0 && (
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md uppercase tracking-wider">
              {activities.length} Recorded
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col divide-y divide-gray-50">
          {activities.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No activity reported</p>
            </div>
          ) : activities.map((act) => {
            const t = TYPE_COLORS[act.type?.toLowerCase()] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
            return (
              <div key={act._id} className="flex items-start gap-8 p-12 hover:bg-gray-50/50 transition-colors group overflow-hidden">
                <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center text-indigo-600 text-lg font-bold flex-shrink-0">
                  {act.createdBy?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-4 flex-wrap mb-4 text-base">
                    <span className="font-bold text-gray-900">{act.createdBy?.name}</span>
                    <span className={`inline-flex items-center gap-2 text-[11px] font-bold px-3 py-1 rounded-md ${t.bg} ${t.text} uppercase tracking-wider border border-current opacity-70`}>
                      {act.type}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">to</span>
                    <span className="font-bold text-blue-600 hover:underline cursor-pointer truncate max-w-[250px]">{act.leadId?.name}</span>
                  </div>
                  {act.notes && (
                    <div className="bg-gray-50/50 rounded-2xl px-6 py-4 border border-gray-100/50 mb-4 shadow-inner">
                      <p className="text-base font-medium text-gray-700 leading-relaxed italic">
                        &ldquo;{act.notes}&rdquo;
                      </p>
                    </div>
                  )}
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest opacity-80 leading-none">
                    {new Date(act.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
