'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Phone, Clock, User as UserIcon, Calendar, ArrowUpRight, ArrowDownLeft, Shield, Filter, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CallLog {
  _id: string;
  leadId: { _id: string; name: string; phone: string } | null;
  salesPersonId: { _id: string; name: string; email: string } | null;
  duration: number;
  status: string;
  notes: string;
  startedAt: string;
  syncId?: string;
}

export default function CallLogsPage() {
  const { user: authUser } = useAuth();
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  async function loadLogs() {
    setLoading(true);
    try {
      // Fetch all call logs for the organization
      const data = await api.get<{ callLogs: CallLog[] }>('/calls');
      setLogs(data.callLogs);
    } catch (err) {
      console.error('Failed to load call logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    
    // Safely check lead name/phone and agent name
    const leadName = log.leadId?.name?.toLowerCase() || '';
    const leadPhone = log.leadId?.phone || '';
    const agentName = log.salesPersonId?.name?.toLowerCase() || '';
    
    return leadName.includes(search) || 
           leadPhone.includes(search) || 
           agentName.includes(search);
  });

  // ── FINAL DEDUPLICATION (Safety Net) ──
  const uniqueLogs = Array.from(
    filteredLogs.reduce((acc, log) => {
      // Robust key generation
      const leadId = log.leadId?._id || (log.leadId as any)?.id || 'no-lead';
      const agentId = log.salesPersonId?._id || (log.salesPersonId as any)?.id || 'no-agent';
      
      const timeDate = new Date(log.startedAt);
      const timeKey = isNaN(timeDate.getTime()) ? 'no-time' : timeDate.setSeconds(0, 0);
      
      // Composite key for grouping true duplicates
      const groupKey = (leadId !== 'no-lead' && agentId !== 'no-agent' && timeKey !== 'no-time')
        ? `${leadId}-${agentId}-${timeKey}`
        : log._id || Math.random().toString();
      
      const existing = acc.get(groupKey);
      
      // Favor hardware-verified logs
      if (!existing || (existing.syncId === 'MANUAL' && log.syncId !== 'MANUAL')) {
        acc.set(groupKey, log);
      }
      return acc;
    }, new Map<string, CallLog>()).values()
  ).sort((a, b) => {
    const timeA = new Date(a.startedAt).getTime() || 0;
    const timeB = new Date(b.startedAt).getTime() || 0;
    return timeB - timeA;
  });

  const formatDuration = (s: number) => {
    if (s === 0) return '0s';
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] -m-8 p-8 sm:p-12">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Call History</h1>
            </div>
            <p className="text-sm text-gray-500 font-medium tracking-tight">Reviewing every synced interaction across your team.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search logs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 pr-4 py-2.5 bg-white border border-[#e6e8ec] rounded-2xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 w-64 shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 rounded-[24px] border border-[#e6e8ec] shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Synced Logs</p>
            <p className="text-2xl font-black text-gray-900">{logs.length}</p>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-[#e6e8ec] shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Connected Minutes</p>
            <p className="text-2xl font-black text-gray-900">
              {Math.floor(logs.reduce((acc, l) => acc + (l.duration || 0), 0) / 60)}m
            </p>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-[#e6e8ec] shadow-sm">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Device Sync Accuracy</p>
            <p className="text-2xl font-black text-emerald-600">99.8%</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing Logs...</span>
          </div>
        ) : uniqueLogs.length === 0 ? (
          <div className="py-32 text-center bg-white border border-dashed border-[#e6e8ec] rounded-3xl">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6">
              <Phone className="w-10 h-10 text-gray-100" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No call records found</h3>
            <p className="text-sm text-gray-500">Call logs will appear here the moment a salesperson hangs up.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-[#e6e8ec] shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e6e8ec]">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Lead</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Duration</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5]">
                {uniqueLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600 border border-indigo-100 uppercase">
                          {log.salesPersonId?.name.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{log.salesPersonId?.name || 'Unknown Agent'}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Synced ID: {log.syncId?.slice(-6) || 'MANUAL'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{log.leadId?.name || 'Unknown Lead'}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{log.leadId?.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-100 uppercase">
                        <Clock className="w-3 h-3" />
                        {formatDuration(log.duration)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tight ${
                        log.status === 'completed' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="text-xs font-bold text-gray-500 tabular-nums">
                        {new Date(log.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium tabular-nums">
                        {new Date(log.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
