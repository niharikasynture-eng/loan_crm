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
    <div className="animate-fade-in pb-10 flex flex-col gap-8">
      <PageHeader
        title="Dashboard Overview"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
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
