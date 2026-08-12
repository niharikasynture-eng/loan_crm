'use client';

import * as React from 'react';
import { 
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff, Clock, 
  Calendar, Users, Search, Download, Filter, TrendingUp, ShieldCheck, 
  BarChart3, UserCheck, ArrowUpRight, ArrowDownRight, RefreshCw 
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/useToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { CallLogTable } from '@/components/features/CallLogTable';
import { ICallLog } from '@/models/CallLog';

interface UserOption {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function CallLogsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<'summary' | 'performance' | 'user'>('summary');

  // Filter States
  const [rangePreset, setRangePreset] = React.useState<string>('all');
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [selectedAgent, setSelectedAgent] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [excludeNumbers, setExcludeNumbers] = React.useState<string>('');

  // Data States
  const [calls, setCalls] = React.useState<ICallLog[]>([]);
  const [users, setUsers] = React.useState<UserOption[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  // Fetch Team Users for Agent Filter
  React.useEffect(() => {
    async function loadUsers() {
      try {
        const data = await api.get<{ users: UserOption[] }>('/users');
        setUsers(data.users || []);
      } catch (err) {
        console.error('Failed to load users for filter:', err);
      }
    }
    loadUsers();
  }, []);

  // Fetch Calls based on active filters
  const loadCalls = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '1000');
      if (selectedAgent && selectedAgent !== 'all') params.append('salesPersonId', selectedAgent);

      let start = startDate;
      let end = endDate;

      // Handle Range Presets
      if (rangePreset !== 'custom' && rangePreset !== 'all') {
        const now = new Date();
        if (rangePreset === 'today') {
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          start = d.toISOString();
        } else if (rangePreset === 'yesterday') {
          const d1 = new Date();
          d1.setDate(d1.getDate() - 1);
          d1.setHours(0, 0, 0, 0);
          const d2 = new Date();
          d2.setDate(d2.getDate() - 1);
          d2.setHours(23, 59, 59, 999);
          start = d1.toISOString();
          end = d2.toISOString();
        } else if (rangePreset === '7days') {
          const d = new Date();
          d.setDate(d.getDate() - 7);
          start = d.toISOString();
        } else if (rangePreset === '30days') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          start = d.toISOString();
        }
      }

      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      const res = await api.get<{ callLogs?: ICallLog[]; calls?: ICallLog[] }>(`/calls?${params.toString()}`);
      setCalls(res.callLogs ?? res.calls ?? []);
    } catch (err: any) {
      toast('error', err.message || 'Failed to fetch call analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedAgent, rangePreset, startDate, endDate]);

  React.useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  // Filtered Calls (Client-side Search & Exclusions)
  const filteredCalls = React.useMemo(() => {
    return calls.filter((call) => {
      // Exclude numbers filter
      const phone = (call.leadId as any)?.phone || '';
      if (excludeNumbers.trim() && phone.includes(excludeNumbers.trim())) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const leadName = ((call.leadId as any)?.name || '').toLowerCase();
        const agentName = ((call.salesPersonId as any)?.name || '').toLowerCase();
        if (!phone.includes(query) && !leadName.includes(query) && !agentName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [calls, searchQuery, excludeNumbers]);

  // Analytics Computation
  const analytics = React.useMemo(() => {
    const total = filteredCalls.length;

    let incoming = 0;
    let outgoing = 0;
    let missed = 0;
    let rejected = 0;

    let incomingDuration = 0;
    let outgoingDuration = 0;

    let incomingAnswered = 0;
    let incomingUnanswered = 0;
    let outgoingAnswered = 0;

    filteredCalls.forEach((call) => {
      const type = (call as any).callType || (call.status === 'missed' ? 'missed' : 'outgoing');
      const dur = call.duration || 0;
      const isConnected = dur > 0 || call.status === 'completed';

      if (type === 'incoming') {
        incoming++;
        incomingDuration += dur;
        if (isConnected) incomingAnswered++;
        else incomingUnanswered++;
      } else if (type === 'missed') {
        missed++;
        incomingUnanswered++;
      } else if (type === 'rejected') {
        rejected++;
        incomingUnanswered++;
      } else {
        // Outgoing
        outgoing++;
        outgoingDuration += dur;
        if (isConnected) outgoingAnswered++;
      }
    });

    const formatDur = (secs: number) => {
      const mins = Math.floor(secs / 60);
      const s = secs % 60;
      return `${mins} Min ${s} Sec`;
    };

    return {
      total,
      incoming,
      outgoing,
      missed,
      rejected,
      incomingPct: total ? Math.round((incoming / total) * 100) : 0,
      outgoingPct: total ? Math.round((outgoing / total) * 100) : 0,
      missedPct: total ? Math.round((missed / total) * 100) : 0,
      rejectedPct: total ? Math.round((rejected / total) * 100) : 0,
      incomingDurationStr: formatDur(incomingDuration),
      outgoingDurationStr: formatDur(outgoingDuration),
      incomingAnswered,
      incomingUnanswered,
      outgoingAnswered,
      totalDurationMins: Math.floor((incomingDuration + outgoingDuration) / 60),
    };
  }, [filteredCalls]);

  // User Performance Leaderboard Aggregation
  const userLeaderboard = React.useMemo(() => {
    const map = new Map<string, { name: string; email: string; avatar?: string; totalCalls: number; durationSecs: number; connectedCalls: number }>();

    filteredCalls.forEach((call) => {
      const agent = call.salesPersonId as any;
      const agentId = agent?._id || 'unknown';
      const agentName = agent?.name || 'Unassigned';
      const agentEmail = agent?.email || '';
      const avatar = agent?.avatar || '';

      if (!map.has(agentId)) {
        map.set(agentId, { name: agentName, email: agentEmail, avatar, totalCalls: 0, durationSecs: 0, connectedCalls: 0 });
      }

      const item = map.get(agentId)!;
      item.totalCalls += 1;
      item.durationSecs += call.duration || 0;
      if ((call.duration || 0) > 0 || call.status === 'completed') {
        item.connectedCalls += 1;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalCalls - a.totalCalls);
  }, [filteredCalls]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <PageHeader
        title="📞 Call Sync & Analytics"
        subtitle="Real-time call tracking, duration reports, and performance analytics"
        action={
          <div className="flex items-center gap-2">
            <button 
              onClick={loadCalls}
              className="px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Logs
            </button>
            <button 
              onClick={() => toast('info', 'Exporting call records to CSV...')}
              className="btn-primary text-xs font-bold flex items-center gap-1.5 shadow-md"
            >
              <Download size={13} /> Export CSV
            </button>
          </div>
        }
      />

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'summary'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <BarChart3 size={15} /> Call Summary
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'performance'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <TrendingUp size={15} /> Performance Analysis
        </button>
        <button
          onClick={() => setActiveTab('user')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'user'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <UserCheck size={15} /> User Analysis
        </button>
      </div>

      {/* ── Advanced Multi-Filter Control Bar ── */}
      <div className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
          <Filter size={14} className="text-indigo-600" /> Filter Options
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Preset Select */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Select Range</label>
            <select
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setRangePreset('custom');
              }}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setRangePreset('custom');
              }}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
            />
          </div>

          {/* Sales Agent Filter */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Sales Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
            >
              <option value="all">All Sales Agents</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name} ({u.role.replace('_', ' ')})</option>
              ))}
            </select>
          </div>

          {/* Mobile / Name Search */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Search Lead / Phone</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search number..."
                className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Exclude Numbers */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Exclude Phone</label>
            <input
              type="text"
              value={excludeNumbers}
              onChange={(e) => setExcludeNumbers(e.target.value)}
              placeholder="e.g. 9999"
              className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none font-medium"
            />
          </div>
        </div>
      </div>

      {/* ── TAB 1: CALL SUMMARY ── */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Buildesk-Style Donut & Breakdown Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800">Call Summary & Distribution</h3>
                <p className="text-xs text-slate-500">Live breakdown of incoming, outgoing, and missed call logs</p>
              </div>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-black font-mono">
                {analytics.total} Total Calls
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Donut Chart Ring */}
              <div className="lg:col-span-5 flex items-center justify-center p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background ring */}
                    <path
                      className="text-slate-200"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Outgoing Blue */}
                    <path
                      className="text-sky-500 transition-all duration-500"
                      strokeDasharray={`${analytics.outgoingPct}, 100`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {/* Incoming Emerald */}
                    <path
                      className="text-emerald-500 transition-all duration-500"
                      strokeDasharray={`${analytics.incomingPct}, 100`}
                      strokeDashoffset={`-${analytics.outgoingPct}`}
                      strokeWidth="4"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-slate-800 tabular-nums">{analytics.total}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Logs</span>
                  </div>
                </div>

                {/* Donut Legend List */}
                <div className="ml-6 space-y-2 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-slate-600">Incoming:</span>
                    <span className="font-bold text-slate-900">{analytics.incoming} ({analytics.incomingPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-500 shrink-0" />
                    <span className="text-slate-600">Outgoing:</span>
                    <span className="font-bold text-slate-900">{analytics.outgoing} ({analytics.outgoingPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-slate-600">Missed:</span>
                    <span className="font-bold text-slate-900">{analytics.missed} ({analytics.missedPct}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-slate-600">Rejected:</span>
                    <span className="font-bold text-slate-900">{analytics.rejected} ({analytics.rejectedPct}%)</span>
                  </div>
                </div>
              </div>

              {/* Call Metrics Grid */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Incoming Answered</span>
                  <p className="text-2xl font-black text-emerald-900">{analytics.incomingAnswered}</p>
                  <p className="text-[11px] text-emerald-700 font-medium">Successful connections</p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-1">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Incoming Duration</span>
                  <p className="text-lg font-black text-emerald-900 truncate">{analytics.incomingDurationStr}</p>
                  <p className="text-[11px] text-emerald-700 font-medium">Total inbound talk time</p>
                </div>

                <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/40 space-y-1">
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest block">Incoming Unanswered</span>
                  <p className="text-2xl font-black text-rose-900">{analytics.incomingUnanswered}</p>
                  <p className="text-[11px] text-rose-700 font-medium">Missed or rejected calls</p>
                </div>

                <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/40 space-y-1">
                  <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block">Outgoing Answered</span>
                  <p className="text-2xl font-black text-sky-900">{analytics.outgoingAnswered}</p>
                  <p className="text-[11px] text-sky-700 font-medium">Outbound connected calls</p>
                </div>

                <div className="p-4 rounded-xl border border-sky-100 bg-sky-50/40 space-y-1">
                  <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest block">Outgoing Duration</span>
                  <p className="text-lg font-black text-sky-900 truncate">{analytics.outgoingDurationStr}</p>
                  <p className="text-[11px] text-sky-700 font-medium">Total outbound talk time</p>
                </div>

                <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-1">
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Total Duration</span>
                  <p className="text-2xl font-black text-indigo-900">{analytics.totalDurationMins} Mins</p>
                  <p className="text-[11px] text-indigo-700 font-medium">Combined team talk time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Call Log History Table */}
          <div className="pt-2">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" /> Call History Records ({filteredCalls.length})
            </h3>
            <CallLogTable logs={filteredCalls} isLoading={loading} />
          </div>
        </div>
      )}

      {/* ── TAB 2: PERFORMANCE ANALYSIS ── */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg Call Duration</span>
                <Clock size={18} className="text-indigo-500" />
              </div>
              <p className="text-3xl font-black text-slate-900">
                {analytics.total ? Math.round((analytics.totalDurationMins * 60) / analytics.total) : 0}s
              </p>
              <p className="text-xs text-slate-500">Average length per phone conversation</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Call Connection Rate</span>
                <ShieldCheck size={18} className="text-emerald-500" />
              </div>
              <p className="text-3xl font-black text-emerald-600">
                {analytics.total ? Math.round(((analytics.incomingAnswered + analytics.outgoingAnswered) / analytics.total) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500">Percentage of calls successfully connected</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outbound Connect Rate</span>
                <ArrowUpRight size={18} className="text-sky-500" />
              </div>
              <p className="text-3xl font-black text-sky-600">
                {analytics.outgoing ? Math.round((analytics.outgoingAnswered / analytics.outgoing) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500">Outbound calls picked up by prospects</p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: USER ANALYSIS (LEADERBOARD) ── */}
      {activeTab === 'user' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-indigo-600" /> Sales Agent Call Leaderboard
          </h3>

          <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Sales Agent</th>
                  <th className="py-3 px-4 text-center">Total Calls</th>
                  <th className="py-3 px-4 text-center">Connected Calls</th>
                  <th className="py-3 px-4 text-center">Total Duration</th>
                  <th className="py-3 px-4 text-right">Avg Talk Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {userLeaderboard.map((item, idx) => (
                  <tr key={item.email || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          {item.avatar ? (
                            <img src={item.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            item.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                          <p className="text-[11px] text-slate-400">{item.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 text-sm">{item.totalCalls}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-100">
                        {item.connectedCalls} ({item.totalCalls ? Math.round((item.connectedCalls / item.totalCalls) * 100) : 0}%)
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                      {Math.floor(item.durationSecs / 60)}m {item.durationSecs % 60}s
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-indigo-600">
                      {item.totalCalls ? Math.round(item.durationSecs / item.totalCalls) : 0}s
                    </td>
                  </tr>
                ))}

                {userLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                      No call activity recorded for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
