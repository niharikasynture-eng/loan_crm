'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import {
  PhoneCall, Users, Award, Target, TrendingUp,
  BarChart3, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/cn';

/* ---------- Stat Card ---------- */

const StatCard = ({ icon: Icon, title, value, sub, iconBg, iconColor }: any) => (
  <div className="card" style={{ padding: '16px 20px' }}>
    <div className="flex items-start justify-between mb-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: iconBg ?? 'var(--brand-soft)' }}
      >
        <Icon size={18} style={{ color: iconColor ?? 'var(--brand)' }} strokeWidth={1.8} />
      </div>
      <div
        className="flex items-center gap-1 px-2.5 py-1 rounded-full"
        style={{ background: '#ecfdf5', color: 'var(--success)', fontSize: '10px', fontWeight: 600 }}
      >
        <TrendingUp size={10} />
        +12%
      </div>
    </div>
    <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
      {title}
    </p>
    <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '4px' }}>
      {value}
    </p>
    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
      {sub}
    </p>
  </div>
);

/* ---------- Main Page ---------- */

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
      <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--border)', borderTopColor: 'var(--brand)' }}
        />
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Loading Analytics
        </p>
      </div>
    );
  }

  const filterStyle = {
    background: '#FFFFFF',
    border: '1px solid var(--border-strong)',
    borderRadius: '8px',
    padding: '9px 36px 9px 14px',
    fontSize: '13px',
    color: 'var(--text-primary)',
    outline: 'none',
    appearance: 'none' as const,
    minWidth: '160px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} style={{ color: 'var(--brand)' }} strokeWidth={2.2} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Performance Dashboard
            </span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Intelligence Center
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Analyze team sales performance and activity metrics.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {isManager && (
            <div className="relative">
              <select
                value={agent}
                onChange={(e) => setAgent(e.target.value)}
                style={filterStyle}
              >
                <option value="all">All Team Members</option>
                {agents.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}

          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={filterStyle}
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">This Month</option>
              <option value="60d">Last 2 Months</option>
              <option value="all">All Time</option>
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      </div>

      {/* KPI Block */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={PhoneCall} title="Total Calls" value={data.callsThisMonth} sub="Outbound call activity"
          iconBg="var(--brand-soft)" iconColor="var(--brand)" />
        <StatCard icon={Award} title="Won Deals" value={`₹${Number(data.wonDealValue).toLocaleString()}`}
          sub={`${data.wonDeals} deals closed`} iconBg="#ecfdf5" iconColor="var(--success)" />
        <StatCard icon={Users} title="New Leads" value={data.totalLeads}
          sub={`+${data.newLeads} this period`} iconBg="#eff6ff" iconColor="#2563eb" />
        <StatCard icon={Target} title="Conversion" value={`${data.conversionRate}%`}
          sub="Lead-to-deal ratio" iconBg="#fffbeb" iconColor="#d97706" />
      </div>

      {/* Activity Log */}
      {isManager && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="flex justify-between items-end">
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Recent Activity
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Chronological team activity log
              </p>
            </div>
            <span
              className="px-3 py-1 rounded-full"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: '12px', fontWeight: 600 }}
            >
              {activities.length} logs
            </span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Lead</th>
                  <th className="text-center">Type</th>
                  <th>Notes</th>
                  <th className="text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                          style={{ background: 'var(--brand)' }}
                        >
                          {a.createdBy?.name?.charAt(0)}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {a.createdBy?.name}
                        </span>
                      </div>
                    </td>

                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {a.leadId?.name || 'Unknown'}
                    </td>

                    <td className="text-center">
                      <span
                        className="px-2.5 py-1 rounded-full"
                        style={{ background: 'var(--brand-soft)', color: 'var(--brand)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}
                      >
                        {a.type}
                      </span>
                    </td>

                    <td>
                      <p className="truncate max-w-xs" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        {a.notes || 'No notes'}
                      </p>
                    </td>

                    <td className="text-right">
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(a.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </p>
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
