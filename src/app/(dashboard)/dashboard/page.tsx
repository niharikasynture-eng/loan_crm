'use client';

import * as React from 'react';
import { Users, TrendingUp, PhoneCall, CheckSquare, Link2, Copy, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { MetricCard } from '@/components/features/MetricCard';
import { RecentActivityList } from '@/components/features/RecentActivityList';
import { Badge } from '@/components/ui/Badge';

interface DashboardMetrics {
  totalLeads: number; newLeads: number; wonLeads: number; lostLeads: number;
  totalDeals: number; wonDeals: number; wonDealValue: number;
  totalActivities: number; callsThisMonth: number; pendingTasks: number; conversionRate: number;
  qualificationRate?: number; wonRate?: number; lossRate?: number; isExecutive?: boolean;
}

export default function DashboardPage() {
  const { user, organization } = useAuth();
  const { toast } = useToast();

  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);

  const publicLeadUrl = typeof window !== 'undefined' && user?.role !== 'super_admin'
    ? `${window.location.protocol}//${window.location.host}/form/${organization?.slug || 'org'}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(publicLeadUrl);
    setCopied(true);
    toast('success', 'Lead form link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  React.useEffect(() => {
    // Automatically trigger 2-Hour SLA Ghost Lead check
    api.get('/cron/ghost-leads').catch(console.error);

    api.get<{ metrics: DashboardMetrics; recentActivities: any[] }>('/dashboard')
      .then((d) => { setMetrics(d.metrics); setActivities(d.recentActivities); })
      .catch(() => toast('error', 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div
          className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }}
        />
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10 flex flex-col gap-5">
      <PageHeader
        title="Dashboard Overview"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        className="mb-1"
      />

      {/* Lead Capture Banner */}
      {(user?.role === 'org_admin' || user?.role === 'manager') && (
        <div
          className="rounded-[24px] border flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 shadow-md transition-shadow hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--brand-soft) 0%, #fff 100%)', borderColor: 'rgba(124,58,237,0.1)' }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100"
              style={{ background: 'var(--brand)', color: '#fff' }}
            >
              <Link2 size={22} />
            </div>
            <div>
              <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Public Lead Capture Link
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                Automatically sync leads from your website or social media.
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-2 bg-white rounded-xl border p-1.5 shrink-0 shadow-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <span
              className="px-4 text-xs font-bold tabular-nums truncate max-w-[280px]"
              style={{ color: 'var(--brand)' }}
            >
              {publicLeadUrl}
            </span>
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold text-white transition-all shrink-0 hover:opacity-90 active:scale-95"
              style={{ background: copied ? 'var(--success)' : 'var(--brand)' }}
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total Leads"
          value={metrics?.totalLeads ?? 0}
          subValue={`${metrics?.newLeads ?? 0} new entries`}
          icon={Users}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />
        <MetricCard
          label="Revenue Won"
          value={`₹${((metrics?.wonDealValue ?? 0) / 100000).toFixed(1)}L`}
          subValue={`${metrics?.wonDeals ?? 0} deals closed`}
          icon={TrendingUp}
          iconBg="#ecfdf5"
          iconColor="#059669"
        />
        <MetricCard
          label="Calls (30d)"
          value={metrics?.callsThisMonth ?? 0}
          subValue={`${metrics?.totalActivities ?? 0} field events`}
          icon={PhoneCall}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <MetricCard
          label="Pending Tasks"
          value={metrics?.pendingTasks ?? 0}
          subValue="Action items"
          icon={CheckSquare}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
      </div>

      {/* Executive Conversion & Rate Analysis Section + Pie Chart */}
      {(user?.role === 'super_admin' || user?.role === 'org_admin' || user?.role === 'manager') && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">Executive Conversion & Rate Analysis</h2>
              <p className="text-xs text-slate-500">Live lead conversion pipeline rates and deal distribution</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-full text-[10px] uppercase tracking-widest border border-indigo-100">
              Admin & Manager Only
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Rate Breakdown Pie / Donut Chart */}
            <div className="lg:col-span-5 flex items-center justify-center p-6 bg-slate-50/60 rounded-2xl border border-slate-100">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Conversion Slice (Emerald) */}
                  <path
                    className="text-emerald-500 transition-all duration-500"
                    strokeDasharray={`${metrics?.conversionRate || 0}, 100`}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Qualification Slice (Indigo) */}
                  <path
                    className="text-indigo-500 transition-all duration-500"
                    strokeDasharray={`${metrics?.qualificationRate || 0}, 100`}
                    strokeDashoffset={`-${metrics?.conversionRate || 0}`}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-slate-800 tabular-nums">{metrics?.conversionRate || 0}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conversion</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="ml-6 space-y-2 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-indigo-500 shrink-0" />
                  <span className="text-slate-600">Qualification:</span>
                  <span className="font-bold text-slate-900">{metrics?.qualificationRate || 0}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-600">Conversion:</span>
                  <span className="font-bold text-slate-900">{metrics?.conversionRate || 0}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
                  <span className="text-slate-600">Won Rate:</span>
                  <span className="font-bold text-slate-900">{metrics?.wonRate || 0}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                  <span className="text-slate-600">Loss Rate:</span>
                  <span className="font-bold text-slate-900">{metrics?.lossRate || 0}%</span>
                </div>
              </div>
            </div>

            {/* Rate Stat Cards Matrix */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Qualification Rate</span>
                <p className="text-2xl font-black text-indigo-900">{metrics?.qualificationRate || 0}%</p>
                <p className="text-[11px] text-indigo-700 font-medium">Inbound to qualified lead ratio</p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Conversion Rate</span>
                <p className="text-2xl font-black text-emerald-900">{metrics?.conversionRate || 0}%</p>
                <p className="text-[11px] text-emerald-700 font-medium">Total leads converted to won deals</p>
              </div>

              <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/40 space-y-1">
                <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block">Won Deal Rate</span>
                <p className="text-2xl font-black text-sky-900">{metrics?.wonRate || 0}%</p>
                <p className="text-[11px] text-sky-700 font-medium">Closed deals won percentage</p>
              </div>

              <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 space-y-1">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">Deal Loss Rate</span>
                <p className="text-2xl font-black text-rose-900">{metrics?.lossRate || 0}%</p>
                <p className="text-[11px] text-rose-700 font-medium">Deals lost ratio</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Recent Activities
          </h2>
          <Badge variant="info" className="px-3 py-1 font-bold tracking-widest text-[10px]">LIVE SYNC</Badge>
        </div>
        <RecentActivityList activities={activities} />
      </div>
    </div>
  );
}
