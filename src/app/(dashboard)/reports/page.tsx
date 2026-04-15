'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { PhoneCall, Users, Award, Target } from 'lucide-react';

/* ---------- UI ---------- */

const Card = ({ children }: any) => (
  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
    {children}
  </div>
);

const StatCard = ({ icon: Icon, title, value, sub }: any) => (
  <Card>
    <div className="flex items-start justify-between">
      <Icon size={20} className="text-indigo-600" />
      <span className="text-xs text-emerald-500 font-semibold">+12%</span>
    </div>
    <div className="mt-4">
      <p className="text-xs text-slate-500 font-semibold truncate">{title}</p>
      <h3 className="text-3xl font-bold text-slate-900 leading-tight">{value}</h3>
      <p className="text-xs text-slate-400 truncate">{sub}</p>
    </div>
  </Card>
);

const Badge = ({ label }: any) => (
  <span className="px-2 py-1 text-xs bg-slate-100 rounded-full text-slate-600 font-semibold">
    {label}
  </span>
);

/* ---------- Page ---------- */

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

      const dash = await api.get<any>(`/dashboard?period=${period}&userId=${agent}`);
      const acts = await api.get<any>(`/reports/activities?period=${period}&userId=${agent}`);
      const ags = await api.get<any>(`/reports/salespeople?period=${period}`);

      setData(dash.metrics);
      setActivities(acts.activities || []);
      setAgents(ags.performance || []);
      setLoading(false);
    }
    load();
  }, [period, agent]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20">

      {/* ---------- Header ---------- */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Intelligence Center</h1>
          <p className="text-slate-500 mt-1">Strategic performance analytics for sales teams</p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          {isManager && (
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm"
            >
              <option value="all">All Agents</option>
              {agents.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}

          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-4 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">This Month</option>
            <option value="60d">Last 2 Months</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* ---------- KPI ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={PhoneCall} title="Total Calls" value={data.callsThisMonth} sub="All call activities" />
        <StatCard icon={Award} title="Won Deals" value={data.wonDeals} sub={`₹${data.wonDealValue}`} />
        <StatCard icon={Users} title="Total Leads" value={data.totalLeads} sub={`+${data.newLeads} new`} />
        <StatCard icon={Target} title="Conversion Rate" value={`${data.conversionRate}%`} sub="Leads converted" />
      </div>

      {/* ---------- Table ---------- */}
      {isManager && (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Follow-up History</h2>
              <p className="text-sm text-slate-500">Latest team interactions</p>
            </div>
            <Badge label={`Last ${activities.length} interactions`} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-slate-500">
                <tr>
                  <th className="py-3 text-left">Agent</th>
                  <th className="py-3 text-left">Lead</th>
                  <th className="py-3 text-center">Type</th>
                  <th className="py-3 text-left">Notes</th>
                  <th className="py-3 text-right pr-2">   Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a._id} className="border-b hover:bg-slate-50">
                    <td className="py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">
                        {a.createdBy?.name?.charAt(0)}
                      </div>
                      {a.createdBy?.name}
                    </td>

                    <td>{a.leadId?.name || 'Unknown'}</td>

                    <td className="text-center">
                      <Badge label={a.type} />
                    </td>

                    <td className="truncate max-w-xs text-slate-600">
                      {a.notes || 'No notes'}
                    </td>

                    <td className="text-right whitespace-nowrap pr-2 text-slate-500">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}