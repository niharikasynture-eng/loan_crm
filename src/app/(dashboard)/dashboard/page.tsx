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
    api.get<{ metrics: DashboardMetrics; recentActivities: any[] }>('/dashboard')
      .then((d) => { setMetrics(d.metrics); setActivities(d.recentActivities); })
      .catch(() => toast('error', 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-10">
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      />

      <div className="h-8" /> {/* Gap after header */}

      {/* Lead Capture Banner */}
      {(user?.role === 'org_admin' || user?.role === 'manager') && (
        <>
          <div
            className="rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5"
            style={{ background: 'var(--brand-soft)', borderColor: 'rgba(124,58,237,0.15)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'var(--brand)', color: '#fff' }}
              >
                <Link2 size={17} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Public Lead Form
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Share this link to automatically capture new leads
                </p>
              </div>
            </div>
            <div
              className="flex items-center gap-2 bg-white rounded-lg border p-1 shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <span
                className="px-3 text-[12px] font-mono truncate max-w-[220px]"
                style={{ color: 'var(--brand)' }}
              >
                {publicLeadUrl}
              </span>
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-all shrink-0"
                style={{ background: copied ? 'var(--success)' : 'var(--brand)' }}
              >
                {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          
          <div className="h-4" /> {/* Minimal gap between banner and stats */}
        </>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Leads"
          value={metrics?.totalLeads ?? 0}
          subValue={`${metrics?.newLeads ?? 0} new this month`}
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
          subValue={`${metrics?.totalActivities ?? 0} total activities`}
          icon={PhoneCall}
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <MetricCard
          label="Pending Tasks"
          value={metrics?.pendingTasks ?? 0}
          subValue="Needs your attention"
          icon={CheckSquare}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
      </div>

      <div className="h-6" /> {/* Minimal gap between stats and activity */}

      {/* Bottom Split */}
      <div className="grid grid-cols-1 gap-8">
        {/* Activity Feed */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Recent Activity
            </h2>
            <Badge variant="info">LIVE</Badge>
          </div>
          <RecentActivityList activities={activities} />
        </div>
      </div>
    </div>
  );
}
