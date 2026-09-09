'use client';

import * as React from 'react';
import { Users, TrendingUp, PhoneCall, CheckSquare, Link2, Copy, CheckCircle, Calendar, Filter, Download, Share2, ExternalLink, Sparkles } from 'lucide-react';
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
  qualificationRate?: number; qualifiedLeads?: number; wonRate?: number; lossRate?: number; isExecutive?: boolean;
}

const PERIOD_OPTIONS = [
  { label: 'All Time Analytics', value: 'all' },
  { label: 'Created Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'This Month', value: 'thisMonth' },
];

export default function DashboardPage() {
  const { user, organization } = useAuth();
  const { toast } = useToast();
  const [period, setPeriod] = React.useState('all');
  const [metrics, setMetrics] = React.useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [copiedInsta, setCopiedInsta] = React.useState(false);
  const [downloadingCalls, setDownloadingCalls] = React.useState(false);

  const publicLeadUrl = typeof window !== 'undefined' && user?.role !== 'super_admin'
    ? `${window.location.protocol}//${window.location.host}/apply/${organization?.slug || 'acme-corp'}`
    : '';

  const instaLeadUrl = publicLeadUrl ? `${publicLeadUrl}?source=Instagram` : '';

  const copyLink = (url: string, isInsta: boolean = false) => {
    navigator.clipboard.writeText(url);
    if (isInsta) {
      setCopiedInsta(true);
      toast('success', 'Instagram campaign link copied!');
      setTimeout(() => setCopiedInsta(false), 2000);
    } else {
      setCopied(true);
      toast('success', 'Lead inquiry link copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  React.useEffect(() => {
    setLoading(true);
    api.get<{ metrics: DashboardMetrics; recentActivities: any[] }>(`/dashboard?period=${period}`)
      .then((d) => { setMetrics(d.metrics); setActivities(d.recentActivities); })
      .catch(() => toast('error', 'Failed to load dashboard metrics'))
      .finally(() => setLoading(false));
  }, [period]);

  const handleShareWhatsApp = () => {
    const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || period;
    const totalLeads = metrics?.totalLeads ?? 0;
    const totalCalls = metrics?.callsThisMonth ?? 0;
    const totalQualified = `${metrics?.qualifiedLeads ?? metrics?.wonLeads ?? 0} (${metrics?.qualificationRate || 0}%)`;
    const totalWon = `${metrics?.wonDeals ?? 0} deals closed (₹${((metrics?.wonDealValue ?? 0) / 100000).toFixed(1)}L)`;

    const text = `📊 *DealByte Sales Analysis Report*\n` +
      `📅 *Date / Period:* ${periodLabel}\n` +
      `👥 *Total Leads:* ${totalLeads}\n` +
      `📞 *Total Calls:* ${totalCalls}\n` +
      `🎯 *Total Qualified:* ${totalQualified}\n` +
      `🏆 *Total Won:* ${totalWon}\n\n` +
      `_Generated via DealByte CRM_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast('success', 'Opening WhatsApp to share report...');
  };

  const handleDownloadCallAnalysis = async () => {
    setDownloadingCalls(true);
    try {
      const now = new Date();
      let start: string | undefined;
      let end: string | undefined;

      if (period === 'today') {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        start = d.toISOString();
      } else if (period === 'yesterday') {
        const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        start = d1.toISOString();
        end = d2.toISOString();
      } else if (period === '7d') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start = d.toISOString();
      } else if (period === '30d') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        start = d.toISOString();
      } else if (period === 'thisMonth') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        start = d.toISOString();
      }

      const params = new URLSearchParams();
      params.set('limit', '2000');
      if (start) params.set('startDate', start);
      if (end) params.set('endDate', end);

      const res = await api.get<{ callLogs?: any[]; calls?: any[] }>(`/calls?${params.toString()}`);
      const logs = res.callLogs || res.calls || [];

      const XLSX = await import('xlsx');
      const periodLabel = PERIOD_OPTIONS.find(p => p.value === period)?.label || period;

      const wb = XLSX.utils.book_new();

      // 1. Summary Analysis Sheet (Exact requested columns)
      const summaryRows = [
        {
          'Date / Period': periodLabel,
          'Total Leads': metrics?.totalLeads ?? 0,
          'Total Calls': metrics?.callsThisMonth ?? 0,
          'Total Qualified': `${metrics?.qualifiedLeads ?? metrics?.wonLeads ?? 0} (${metrics?.qualificationRate || 0}%)`,
          'Total Won': `${metrics?.wonDeals ?? 0} deals closed (₹${((metrics?.wonDealValue ?? 0) / 100000).toFixed(1)}L)`,
        }
      ];

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Sales Analysis');

      // 2. Call Logs Detail Sheet
      const callRows = logs.map((call: any) => {
        const lead = call.leadId || {};
        const agent = call.salesPersonId || {};
        const durationSec = call.duration || 0;
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        const durationStr = `${mins}m ${secs}s`;

        return {
          'Date & Time': call.startedAt ? new Date(call.startedAt).toLocaleString() : new Date(call.createdAt).toLocaleString(),
          'Client Name': lead.name || 'Unknown Client',
          'Phone Number': lead.phone || '—',
          'Company': lead.company || '—',
          'Sales Agent': agent.name || 'Unassigned',
          'Call Direction / Type': (call.callType || call.type || (call.status === 'missed' ? 'missed' : 'outgoing')).toUpperCase(),
          'Status / Outcome': (call.outcome || call.status || 'completed').toUpperCase(),
          'Duration (Seconds)': durationSec,
          'Talk Time': durationStr,
          'Call Notes': call.notes || '—',
        };
      });

      const wsCalls = XLSX.utils.json_to_sheet(callRows.length > 0 ? callRows : [{
        'Date & Time': 'No call logs recorded for the selected period',
        'Client Name': '—',
        'Phone Number': '—',
        'Company': '—',
        'Sales Agent': '—',
        'Call Direction / Type': '—',
        'Status / Outcome': '—',
        'Duration (Seconds)': 0,
        'Talk Time': '0m 0s',
        'Call Notes': '—',
      }]);
      XLSX.utils.book_append_sheet(wb, wsCalls, 'Call Records');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Call_Analysis_${period}_${dateStr}.xlsx`);

      toast('success', `🎉 Downloaded Call Analysis (${periodLabel})`);
    } catch (err: any) {
      toast('error', err.message || 'Failed to download call analysis');
    } finally {
      setDownloadingCalls(false);
    }
  };

  return (
    <div className="animate-fade-in pb-10 flex flex-col gap-5">
      <PageHeader
        title="Dashboard Overview"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        className="mb-1"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
              <Calendar size={15} className="text-indigo-600 shrink-0" />
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 hidden sm:inline">Analytics Range:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent border-none focus:outline-none cursor-pointer pr-1"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all rounded-xl shadow-md cursor-pointer"
              title="Share Sales Analysis Report via WhatsApp"
            >
              <Share2 size={14} />
              Share on WhatsApp
            </button>

            {(user?.role === 'org_admin' || user?.role === 'manager' || user?.role === 'super_admin') && (
              <button
                onClick={handleDownloadCallAnalysis}
                disabled={downloadingCalls}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                title="Download Call Analysis Excel Report for selected date range"
              >
                <Download size={14} className={downloadingCalls ? 'animate-bounce' : ''} />
                {downloadingCalls ? 'Exporting...' : 'Download Call Analysis'}
              </button>
            )}
          </div>
        }
      />

      {/* Lead Capture Banner */}
      {(user?.role === 'org_admin' || user?.role === 'manager') && (
        <div
          className="rounded-3xl border flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 shadow-md transition-shadow hover:shadow-lg bg-gradient-to-r from-indigo-50/80 via-purple-50/40 to-white"
          style={{ borderColor: 'rgba(99, 102, 241, 0.2)' }}
        >
          <div className="flex items-start sm:items-center gap-4">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100 bg-indigo-600 text-white"
            >
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-base font-black text-slate-900">
                  Instagram & Campaign Lead Capture Link
                </p>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                  Live Public Form
                </span>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-0.5 max-w-xl">
                Share this link in your Instagram bio, ad campaigns, or WhatsApp. Leads are instantly saved in Sales CRM and queued in the Loan Operator workflow.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Direct Copy Button */}
            <button
              type="button"
              onClick={() => copyLink(publicLeadUrl, false)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shrink-0 shadow-2xs"
            >
              {copied ? <CheckCircle size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-500" />}
              <span>{copied ? 'Link Copied!' : 'Copy Form Link'}</span>
            </button>

            {/* Instagram Link Button */}
            <button
              type="button"
              onClick={() => copyLink(instaLeadUrl, true)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shrink-0 shadow-md shadow-pink-500/20 bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:opacity-95 active:scale-95 cursor-pointer"
            >
              {copiedInsta ? <CheckCircle size={14} /> : <Share2 size={14} />}
              <span>{copiedInsta ? 'Insta Link Copied!' : 'Copy Instagram Link'}</span>
            </button>

            {/* Preview Form in New Tab */}
            <a
              href={publicLeadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all shrink-0"
              title="Preview Public Lead Form in new tab"
            >
              <ExternalLink size={16} />
            </a>
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
