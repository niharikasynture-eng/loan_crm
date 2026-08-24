'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import {
  PhoneCall, Users, Award, Target, TrendingUp,
  BarChart3, ChevronDown, Download, Share2
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
  const { toast } = useToast();
  const isManager = user?.role === 'org_admin' || user?.role === 'manager';

  const [data, setData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);

  const [period, setPeriod] = useState('30d');
  const [agent, setAgent] = useState('all');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const getPeriodLabel = (p: string) => {
    switch (p) {
      case 'today': return 'Today';
      case '7d': return 'Last 7 Days';
      case '30d': return 'This Month';
      case '60d': return 'Last 2 Months';
      default: return 'All Time';
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const dash = await api.get<any>(`/dashboard?period=${period}&userId=${agent}`).catch(() => null);
        setData(dash?.metrics || { callsThisMonth: 0, wonDealValue: 0, wonDeals: 0, totalLeads: 0, newLeads: 0, conversionRate: 0 });

        const acts = await api.get<any>(`/reports/activities?period=${period}&userId=${agent}`).catch(() => ({ activities: [] }));
        setActivities(acts.activities || []);

        if (isManager) {
          const ags = await api.get<any>(`/reports/salespeople?period=${period}`).catch(() => ({ performance: [] }));
          const salesAgentsOnly = (ags.performance || []).filter(
            (a: any) => a.role !== 'org_admin' && a.role !== 'super_admin'
          );
          setAgents(salesAgentsOnly);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period, agent, isManager]);

  const handleShareWhatsApp = () => {
    const periodLabel = getPeriodLabel(period);
    const totalLeads = data?.totalLeads || 0;
    const totalCalls = data?.callsThisMonth || 0;
    const totalQualified = `${data?.qualifiedLeads ?? data?.wonLeads ?? 0} (${data?.qualificationRate || 0}%)`;
    const totalWon = `${data?.wonDeals || 0} deals (₹${Number(data?.wonDealValue || 0).toLocaleString()})`;

    const text = `📊 *DealByte Sales Analysis Report*\n` +
      `📅 *Date / Period:* ${periodLabel}\n` +
      `👥 *Total Leads:* ${totalLeads}\n` +
      `📞 *Total Calls:* ${totalCalls}\n` +
      `🎯 *Total Qualified:* ${totalQualified}\n` +
      `🏆 *Total Won:* ${totalWon}\n\n` +
      `_Generated via DealByte CRM_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    toast('success', 'Opening WhatsApp to share analysis...');
  };

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const periodLabel = getPeriodLabel(period);

      // 1. Summary Analysis Sheet (Exact requested columns)
      const summaryRows = [
        {
          'Date / Period': periodLabel,
          'Total Leads': data?.totalLeads || 0,
          'Total Calls': data?.callsThisMonth || 0,
          'Total Qualified': `${data?.qualifiedLeads ?? data?.wonLeads ?? 0} (${data?.qualificationRate || 0}%)`,
          'Total Won': `${data?.wonDeals || 0} deals (₹${Number(data?.wonDealValue || 0).toLocaleString()})`,
        }
      ];

      // Detailed KPI list rows
      const overviewRows = [
        { Metric: 'Report Period', Value: periodLabel },
        { Metric: 'Selected Team Member', Value: agent === 'all' ? 'All Team Members' : agents.find(a => a.id === agent)?.name || agent },
        { Metric: 'Total Leads', Value: data?.totalLeads || 0 },
        { Metric: 'Total Calls Logged', Value: data?.callsThisMonth || 0 },
        { Metric: 'Total Qualified Leads', Value: data?.qualifiedLeads ?? data?.wonLeads ?? 0 },
        { Metric: 'Total Won Revenue', Value: `₹${Number(data?.wonDealValue || 0).toLocaleString()}` },
        { Metric: 'Total Won Deals Count', Value: data?.wonDeals || 0 },
        { Metric: 'Qualification Rate', Value: `${data?.qualificationRate || 0}%` },
        { Metric: 'Conversion Rate', Value: `${data?.conversionRate || 0}%` },
      ];

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Sales Analysis');

      const wsOverview = XLSX.utils.json_to_sheet(overviewRows);
      XLSX.utils.book_append_sheet(wb, wsOverview, 'KPI Details');

      // 2. Team Leaderboard Sheet
      if (agents.length > 0) {
        const agentRows = agents.map((a: any) => ({
          'Sales Person Name': a.name || 'Unknown',
          'Role': (a.role || 'sales_agent').toUpperCase(),
          'Total Calls': a.calls || 0,
          'Won Deals': a.wonDeals || 0,
          'Won Revenue': a.wonValue ? `₹${Number(a.wonValue).toLocaleString()}` : '₹0',
          'Conversion Rate': `${a.conversionRate || 0}%`,
        }));
        const wsAgents = XLSX.utils.json_to_sheet(agentRows);
        XLSX.utils.book_append_sheet(wb, wsAgents, 'Team Leaderboard');
      }

      // 3. Activity Logs Sheet
      const activityRows = activities.map((a: any) => ({
        'Date & Time': new Date(a.createdAt).toLocaleString('en-IN'),
        'Agent Name': a.createdBy?.name || 'Unknown',
        'Client / Lead Name': a.leadId?.name || 'Unknown',
        'Activity Type': (a.type || 'activity').toUpperCase(),
        'Notes & Details': a.notes || '—',
      }));

      const wsActivities = XLSX.utils.json_to_sheet(activityRows.length > 0 ? activityRows : [{
        'Date & Time': 'No activity logs found for selected period',
        'Agent Name': '—',
        'Client / Lead Name': '—',
        'Activity Type': '—',
        'Notes & Details': '—',
      }]);
      XLSX.utils.book_append_sheet(wb, wsActivities, 'Activity Logs');

      const dateStr = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Performance_Report_${period}_${dateStr}.xlsx`);
      toast('success', `🎉 Report downloaded successfully for ${periodLabel}!`);
    } catch (err: any) {
      toast('error', err.message || 'Failed to export report');
    } finally {
      setDownloading(false);
    }
  };

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
            Analyze sales performance, call history, and activity metrics.
          </p>
        </div>

        {/* Filters & Action Options */}
        <div className="flex flex-wrap items-center gap-3">
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

          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all rounded-lg shadow-md cursor-pointer"
            title="Share Sales Analysis Report via WhatsApp"
          >
            <Share2 size={14} />
            Share on WhatsApp
          </button>

          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all rounded-lg shadow-md disabled:opacity-50 cursor-pointer"
            title="Download Performance Report Excel File"
          >
            <Download size={14} className={downloading ? 'animate-bounce' : ''} />
            {downloading ? 'Exporting...' : 'Download Report'}
          </button>
        </div>
      </div>

      {/* KPI Block */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={PhoneCall}
          title="Total Calls"
          value={data.callsThisMonth}
          sub="Outbound call activity"
          iconBg="var(--brand-soft)"
          iconColor="var(--brand)"
        />
        <StatCard
          icon={Target}
          title="Qualified"
          value={data.qualifiedLeads ?? data.wonLeads ?? 0}
          sub={`${data.qualificationRate || 0}% qualification rate`}
          iconBg="#ecfdf5"
          iconColor="var(--success)"
        />
        <StatCard
          icon={Users}
          title="Total Leads"
          value={data.totalLeads}
          sub={`+${data.newLeads} new entries`}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />
        <StatCard
          icon={Award}
          title="Won Deals"
          value={`₹${Number(data.wonDealValue || 0).toLocaleString()}`}
          sub={`${data.wonDeals || 0} deals closed`}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
      </div>

      {/* Executive Rate Analysis Matrix (Only for Super Admin, Org Admin, & Manager) */}
      {isManager && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">Executive Conversion & Rate Analytics</h2>
              <p className="text-xs text-slate-500">Restricted manager metrics: Qualification, Conversion, Won & Loss rates</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-full text-[10px] uppercase tracking-widest border border-indigo-100">
              Admin & Manager Only
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Qualification Rate</span>
              <p className="text-2xl font-black text-indigo-900">{data.qualificationRate || 0}%</p>
              <p className="text-[11px] text-indigo-700 font-medium">Inbound to qualified lead ratio</p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Conversion Rate</span>
              <p className="text-2xl font-black text-emerald-900">{data.conversionRate || 0}%</p>
              <p className="text-[11px] text-emerald-700 font-medium">Total leads converted to won deals</p>
            </div>

            <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/40 space-y-1">
              <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block">Won Deal Rate</span>
              <p className="text-2xl font-black text-sky-900">{data.wonRate || 0}%</p>
              <p className="text-[11px] text-sky-700 font-medium">Closed deals won percentage</p>
            </div>

            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 space-y-1">
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">Deal Loss Rate</span>
              <p className="text-2xl font-black text-rose-900">{data.lossRate || 0}%</p>
              <p className="text-[11px] text-rose-700 font-medium">Deals lost ratio</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex justify-between items-end">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {isManager ? 'Recent Activity' : 'Your Recent Activity Log'}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {isManager ? 'Chronological team activity log' : 'Chronological log of your calls and client interactions'}
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
    </div>
  );
}
