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
          className="w-7 h-7 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }}
        />
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      />

      {/* Lead Capture Banner — compact */}
      {(user?.role === 'org_admin' || user?.role === 'manager') && (
        <div
          className="rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
          style={{ background: 'var(--brand-soft)', borderColor: 'rgba(108,92,231,0.15)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--brand)', color: '#fff' }}
            >
              <Link2 size={15} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Public Lead Form
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Share this link to capture new leads automatically
              </p>
            </div>
          </div>
          <div
            className="flex items-center gap-3 bg-white rounded-lg border p-1.5 shrink-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <span
              className="px-2 font-mono truncate max-w-[150px] sm:max-w-[250px] md:max-w-[350px]"
              style={{ fontSize: '12px', color: 'var(--text-muted)' }}
            >
              {publicLeadUrl}
            </span>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-white transition-all shrink-0 shadow-sm"
              style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', background: copied ? 'var(--success)' : 'var(--brand)' }}
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Grid — fully responsive */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
        }}
        className="sm:grid-cols-2 lg:grid-cols-4"
      >
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

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Recent Activity
          </h2>
          <Badge variant="info">LIVE</Badge>
        </div>
        <RecentActivityList activities={activities} />
      </div>
    </div>
  );
}
