'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp, Users, PhoneCall, CheckSquare,
  Target, Award, BarChart2, ArrowUpRight, ArrowDownRight,
  Mail, Calendar
} from 'lucide-react';

interface ReportData {
  leads: {
    total: number; new: number; contacted: number;
    qualified: number; won: number; lost: number;
  };
  deals: {
    total: number; won: number; lost: number; totalValue: number; wonValue: number;
  };
  activities: { total: number; calls: number; meetings: number; emails: number; };
  tasks: { total: number; completed: number; pending: number; overdue: number; };
  conversionRate: number;
  topSalesPerson?: { name: string; wonDeals: number };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [data, setData]       = useState<ReportData | null>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const isAdminOrManager = user?.role === 'org_admin' || user?.role === 'manager';

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [dash, perf] = await Promise.all([
          api.get<any>('/dashboard'),
          isAdminOrManager ? api.get<any>('/reports/salespeople') : Promise.resolve({ performance: [] })
        ]);
        
        const m = dash.metrics;
        setData({
          leads: {
            total: m.totalLeads,
            new: m.newLeads,
            contacted: m.contactedLeads || 0,
            qualified: m.qualifiedLeads || 0,
            won: m.wonLeads,
            lost: m.lostLeads,
          },
          deals: {
            total: m.totalDeals,
            won: m.wonDeals,
            lost: 0,
            totalValue: m.wonDealValue,
            wonValue: m.wonDealValue,
          },
          activities: {
            total: m.totalActivities,
            calls: m.callsThisMonth,
            meetings: 0,
            emails: 0,
          },
          tasks: {
            total: m.totalActivities,
            completed: m.totalActivities - m.pendingTasks,
            pending: m.pendingTasks,
            overdue: 0,
          },
          conversionRate: m.conversionRate,
        });
        setPerformance(perf.performance || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period, isAdminOrManager]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
      <div className="w-10 h-10 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Generating Reports...</p>
    </div>
  );

  const d = data!;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header + Period Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase whitespace-nowrap">Intelligence Center</h1>
          <p className="text-sm text-gray-500 font-medium">Performance analytics and team productivity tracking.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 self-start">
          {(['7d', '30d', '90d', 'all'] as const).map(p => (
            <button 
              key={p} 
              onClick={() => setPeriod(p)} 
              className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${period === p ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              {p === 'all' ? 'All Time' : p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Leads</p>
                  <h3 className="text-3xl font-black text-gray-900 leading-none">{d.leads.total}</h3>
               </div>
               <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                  <Users size={20} />
               </div>
            </div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-md inline-block">+{d.leads.new} Recently</p>
         </div>

         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Won Deals</p>
                  <h3 className="text-3xl font-black text-gray-900 leading-none">{d.deals.won}</h3>
               </div>
               <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <Award size={20} />
               </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase">₹{d.deals.wonValue?.toLocaleString()}</p>
         </div>

         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sales Velocity</p>
                  <h3 className="text-3xl font-black text-gray-900 leading-none">{d.activities.total}</h3>
               </div>
               <div className="w-10 h-10 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
                  <TrendingUp size={20} />
               </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase">{d.activities.calls} Calls Logged</p>
         </div>

         <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Success Rate</p>
                  <h3 className="text-3xl font-black text-gray-900 leading-none">{d.conversionRate}%</h3>
               </div>
               <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                  <Target size={20} />
               </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Leads to Deals Conv.</p>
         </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
           <div className="flex items-center gap-2 mb-8">
              <BarChart2 size={16} className="text-indigo-600" />
              <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Lead Journey Breakdown</h2>
           </div>
           <div className="space-y-6">
              {[
                { label: 'New Inbound', value: d.leads.new, color: 'bg-indigo-500' },
                { label: 'Actively Contacted', value: d.leads.contacted, color: 'bg-blue-500' },
                { label: 'Sales Qualified', value: d.leads.qualified, color: 'bg-amber-500' },
                { label: 'Closed Won', value: d.leads.won, color: 'bg-emerald-500' },
                { label: 'Closed Lost', value: d.leads.lost, color: 'bg-red-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{item.label}</span>
                    <span className="text-sm font-black text-gray-900">{item.value}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                      style={{ width: `${d.leads.total > 0 ? (item.value / d.leads.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-8">
            <PhoneCall size={16} className="text-emerald-600" />
            <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Activity Distribution</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
             {[
               { label: 'Calls', value: d.activities.calls, icon: PhoneCall, color: 'text-indigo-600', bg: 'bg-indigo-50' },
               { label: 'Emails', value: d.activities.emails, icon: Mail, color: 'text-sky-600', bg: 'bg-sky-50' },
               { label: 'Meetings', value: d.activities.meetings, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
               { label: 'Notes', value: d.activities.total - d.activities.calls, icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' },
             ].map(item => (
               <div key={item.label} className={`${item.bg} p-5 rounded-2xl border border-white/50`}>
                 <item.icon size={16} className={`${item.color} mb-3`} />
                 <p className="text-2xl font-black text-gray-900 mb-1">{item.value}</p>
                 <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{item.label}</p>
               </div>
             ))}
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-50">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-black text-gray-900 uppercase">Workload Capacity</h3>
               <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">{d.tasks.completed}/{d.tasks.total} Tasks</span>
             </div>
             <div className="h-4 w-full bg-gray-50 rounded-xl p-1">
               <div 
                 className="h-full bg-emerald-500 rounded-lg shadow-sm transition-all duration-1000"
                 style={{ width: `${d.tasks.total > 0 ? (d.tasks.completed / d.tasks.total) * 100 : 0}%` }}
               />
             </div>
          </div>
        </div>
      </div>

      {/* TEAM PERFORMANCE - ADMIN ONLY */}
      {isAdminOrManager && performance.length > 0 && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
               <Award size={16} className="text-amber-600" />
               <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Team Performance Analytics</h2>
            </div>
          </div>
          
          <div className="overflow-x-auto -mx-8">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 border-y border-gray-50">
                  <th className="px-8 py-4 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Salesperson</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Calls</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Emails</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">WhatsApp</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Meetings</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">Deals Won</th>
                  <th className="px-8 py-4 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Win Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {performance.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-black">
                          {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover rounded-xl" alt="" /> : p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 uppercase tracking-tight leading-none mb-1">{p.name}</p>
                          <p className="text-[9px] text-gray-400 font-medium lowercase tracking-tight">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-xs font-black text-gray-600">{p.stats.calls}</td>
                    <td className="px-6 py-5 text-center text-xs font-black text-gray-600">{p.stats.emails}</td>
                    <td className="px-6 py-5 text-center text-xs font-black text-gray-600">{p.stats.whatsapp}</td>
                    <td className="px-6 py-5 text-center text-xs font-black text-gray-600">{p.stats.meetings}</td>
                    <td className="px-6 py-5 text-center">
                       <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black">
                         {p.stats.wonDeals}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right text-xs font-black text-gray-900">
                      ₹{p.stats.wonValue?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
