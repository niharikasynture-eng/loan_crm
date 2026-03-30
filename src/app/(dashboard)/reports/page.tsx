'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import {
  TrendingUp, Users, PhoneCall, CheckSquare,
  Target, Award, BarChart2, ArrowUpRight, ArrowDownRight,
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
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Pull from existing dashboard endpoint + leads count
        const dash = await api.get<any>('/dashboard');
        const m = dash.metrics;
        setData({
          leads: {
            total: m.totalLeads,
            new: m.newLeads,
            contacted: 0,
            qualified: 0,
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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period]);

  const PERIOD_LABELS = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', all: 'All time' };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  function StatCard({ label, value, sub, subUp, icon: Icon, iconBg, iconColor }: {
    label: string; value: string | number; sub?: string; subUp?: boolean;
    icon: any; iconBg: string; iconColor: string;
  }) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 22px', transition: 'box-shadow 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,115,232,0.08)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={18} style={{ color: iconColor }} />
          </div>
        </div>
        <p style={{ fontSize: 30, fontWeight: 800, color: '#1a202c', lineHeight: 1 }}>{value}</p>
        {sub && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
            {subUp !== undefined && (subUp
              ? <ArrowUpRight size={13} style={{ color: '#0f9d58' }} />
              : <ArrowDownRight size={13} style={{ color: '#d93025' }} />)}
            <span style={{ fontSize: 12, color: subUp === undefined ? '#a0aec0' : subUp ? '#0f9d58' : '#d93025', fontWeight: 500 }}>{sub}</span>
          </div>
        )}
      </div>
    );
  }

  function ProgressRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: '#4a5568', fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a202c' }}>{value} <span style={{ color: '#a0aec0', fontWeight: 400 }}>({pct}%)</span></span>
        </div>
        <div style={{ height: 8, background: '#f0f4f9', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 100, transition: 'width 0.6s ease' }} />
        </div>
      </div>
    );
  }

  const d = data!;
  const convRate = d.conversionRate ?? (d.leads.total > 0 ? Math.round((d.leads.won / d.leads.total) * 100) : 0);

  return (
    <div style={{ maxWidth: 1280 }}>
      {/* Header + Period Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c' }}>Reports & Analytics</h1>
          <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>Track performance and key sales metrics</p>
        </div>
        <div style={{ display: 'flex', gap: 6, background: '#f0f4f9', padding: 4, borderRadius: 8 }}>
          {(['7d', '30d', '90d', 'all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: period === p ? '#fff' : 'transparent',
              color: period === p ? '#1a73e8' : '#718096',
              boxShadow: period === p ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Leads"     value={d.leads.total}     sub={`${d.leads.new} new`}           subUp={d.leads.new > 0} icon={Users}      iconBg="#e8f0fe" iconColor="#1a73e8" />
        <StatCard label="Won Deals"       value={d.deals.won}        sub={`₹${d.deals.wonValue?.toLocaleString()}`} subUp={d.deals.won > 0} icon={Award} iconBg="#e6f4ea" iconColor="#0f9d58" />
        <StatCard label="Activities"      value={d.activities.total} sub={`${d.activities.calls} calls`}  icon={PhoneCall}  iconBg="#e3f6fd" iconColor="#0277bd" />
        <StatCard label="Conversion Rate" value={`${convRate}%`}     sub="Leads to Won"                   icon={Target}     iconBg="#fef7e0" iconColor="#f29900" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Lead Status Breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '22px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <BarChart2 size={16} style={{ color: '#1a73e8' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Lead Status Breakdown</h3>
          </div>
          <ProgressRow label="New"       value={d.leads.new}       total={d.leads.total} color="#1a73e8" />
          <ProgressRow label="Contacted" value={d.leads.contacted} total={d.leads.total} color="#0277bd" />
          <ProgressRow label="Qualified" value={d.leads.qualified} total={d.leads.total} color="#f29900" />
          <ProgressRow label="Won"       value={d.leads.won}       total={d.leads.total} color="#0f9d58" />
          <ProgressRow label="Lost"      value={d.leads.lost}      total={d.leads.total} color="#d93025" />
        </div>

        {/* Activity Breakdown */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '22px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <PhoneCall size={16} style={{ color: '#0f9d58' }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Activity Breakdown</h3>
          </div>
          <ProgressRow label="Calls"    value={d.activities.calls}    total={d.activities.total} color="#1a73e8" />
          <ProgressRow label="Meetings" value={d.activities.meetings} total={d.activities.total} color="#0f9d58" />
          <ProgressRow label="Emails"   value={d.activities.emails}   total={d.activities.total} color="#f29900" />

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f4f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <CheckSquare size={15} style={{ color: '#7c3aed' }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1a202c' }}>Task Summary</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Completed', value: d.tasks.completed, color: '#0f9d58', bg: '#e6f4ea' },
                { label: 'Pending',   value: d.tasks.pending,   color: '#f29900', bg: '#fef7e0' },
                { label: 'Overdue',   value: d.tasks.overdue,   color: '#d93025', bg: '#fce8e6' },
                { label: 'Total',     value: d.tasks.total,     color: '#1a73e8', bg: '#e8f0fe' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 8, padding: '10px 14px', textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color, margin: 0 }}>{value}</p>
                  <p style={{ fontSize: 11, color, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline summary */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '22px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <TrendingUp size={16} style={{ color: '#0f9d58' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Pipeline Overview</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Total Deals',  value: d.deals.total,                         color: '#1a73e8', bg: '#e8f0fe' },
            { label: 'Won',          value: d.deals.won,                            color: '#0f9d58', bg: '#e6f4ea' },
            { label: 'Total Value',  value: `₹${d.deals.totalValue?.toLocaleString() || 0}`, color: '#7c3aed', bg: '#f3f0ff' },
            { label: 'Won Value',    value: `₹${d.deals.wonValue?.toLocaleString()  || 0}`,  color: '#f29900', bg: '#fef7e0' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, border: `1px solid ${color}22`, borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color, margin: '0 0 4px' }}>{value}</p>
              <p style={{ fontSize: 12, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
