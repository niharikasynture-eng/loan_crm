'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { PhoneCall, Users, Award, Target, TrendingUp, Calendar, User as UserIcon, LayoutDashboard, BarChart3, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/* ---------- UI COMPONENTS ---------- */

const Card = ({ children, className }: any) => (
  <div className={cn("bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const StatCard = ({ icon: Icon, title, value, sub, trend = "+12%" }: any) => (
  <Card className="p-0 border-none bg-transparent">
    <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full flex flex-col justify-between hover:border-indigo-200 transition-all duration-200 group">
      <div>
        <div className="flex items-start justify-between mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 transition-colors">
            <Icon size={20} />
          </div>
          <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <TrendingUp size={10} />
            {trend}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-2">
            {value}
          </h3>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-50">
        <p className="text-[11px] font-medium text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis pl-4">
          {sub}
        </p>
      </div>
    </div>
  </Card>
);

const Badge = ({ label, variant = 'gray' }: any) => {
  const variants: any = {
    gray: 'bg-slate-100 text-slate-600',
    blue: 'bg-indigo-50 text-indigo-600',
    indigo: 'bg-indigo-600 text-white',
    emerald: 'bg-emerald-50 text-emerald-600',
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide", variants[variant])}>
      {label}
    </span>
  );
};

/* ---------- MAIN PAGE ---------- */

export default function ReportsPage() {
  const { user } = useAuth();
  const isManager = user?.role === 'org_admin' || user?.role === 'manager';

  const [data, setData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [period, setPeriod] = useState('30d');
  const [agent, setAgent] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const dash = await api.get<any>(`/dashboard?period=${period}&userId=${agent}`);
        const acts = await api.get<any>(`/reports/activities?period=${period}&userId=${agent}`);
        const ags = await api.get<any>(`/reports/salespeople?period=${period}`);

        setData(dash.metrics);
        setActivities(acts.activities || []);
        setAgents(ags.performance || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period, agent]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50/20">
        <div className="w-8 h-8 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Loading Analytics</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32 pt-10 space-y-10">

      {/* ---------- HEADER SECTION ---------- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={18} className="text-indigo-600" strokeWidth={2.5} />
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">Performance Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Intelligence Center</h1>
          <p className="text-sm font-medium text-slate-500">Analyze team sales performance and activity metrics.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {isManager && (
            <div className="relative group">
              <select
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl pl-8 pr-10 py-2.5 text-[13px] text-slate-700 outline-none focus:border-indigo-600 transition-all appearance-none min-w-[170px] cursor-pointer"
              >
                <option value="all">All Team Members</option>
                {agents.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 pointer-events-none transition-colors" />
            </div>
          )}

          <div className="relative group">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl pl-8 pr-10 py-2.5 text-[13px] text-slate-700 outline-none focus:border-indigo-600 transition-all appearance-none min-w-[150px] cursor-pointer"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">This Month</option>
              <option value="60d">Last 2 Months</option>
              <option value="all">All Time</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 pointer-events-none transition-colors" />
          </div>
        </div>
      </div>

      {/* ---------- KPI BLOCK ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={PhoneCall} title="Total Calls" value={data.callsThisMonth} sub="Outbound call activity" />
        <StatCard icon={Award} title="Won Deals" value={`₹${Number(data.wonDealValue).toLocaleString()}`} sub={`${data.wonDeals} deals closed`} />
        <StatCard icon={Users} title="New Leads" value={data.totalLeads} sub={`+${data.newLeads} this period`} />
        <StatCard icon={Target} title="Conversion" value={`${data.conversionRate}%`} sub="Lead-to-deal ratio" />
      </div>

      {/* ---------- ACTIVITY LOG ---------- */}
      {isManager && (
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Recent Activity</h2>
              <p className="text-sm font-medium text-slate-400">Chronological team activity log</p>
            </div>
            <Badge label={`${activities.length} logs`} variant="indigo" />
          </div>

          <Card className="border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Agent</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lead</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Type</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notes</th>
                    <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activities.map((a) => (
                    <tr key={a._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold">
                            {a.createdBy?.name?.charAt(0)}
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{a.createdBy?.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-slate-600">
                        {a.leadId?.name || 'Unknown'}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-bold uppercase">{a.type}</span>
                      </td>

                      <td className="px-6 py-4 max-w-xs">
                        <p className="text-sm text-slate-500 truncate">{a.notes || 'No notes'}</p>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <p className="text-sm font-medium text-slate-700">
                          {new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">
                          {new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
