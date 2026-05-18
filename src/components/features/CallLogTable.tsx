'use client';

import * as React from 'react';
import { Clock, Phone, Shield, X } from 'lucide-react';
import { ICallLog } from '@/models/CallLog';

interface CallLogTableProps {
  logs: ICallLog[];
  isLoading: boolean;
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  completed: { bg: '#ecfdf5', color: '#059669' },
  failed:    { bg: '#fef2f2', color: '#dc2626' },
  missed:    { bg: '#fef2f2', color: '#dc2626' },
  default:   { bg: '#fffbeb', color: '#d97706' },
};

function formatDuration(s: number) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function CallLogTable({ logs, isLoading }: CallLogTableProps) {
  const uniqueLogs = React.useMemo(() => {
    return Array.from(
      logs.reduce((acc, log) => {
        const leadId  = (log.leadId as any)?._id  || 'unknown';
        const agentId = (log.salesPersonId as any)?._id || 'unknown';
        const t       = new Date(log.startedAt);
        const tKey    = isNaN(t.getTime()) ? 'no-time' : t.setSeconds(0, 0);
        const key     = leadId !== 'unknown' && agentId !== 'unknown' && tKey !== 'no-time'
          ? `${leadId}-${agentId}-${tKey}`
          : log._id.toString();
        const existing = acc.get(key);
        if (!existing || (existing.syncId === 'MANUAL' && log.syncId !== 'MANUAL')) {
          acc.set(key, log);
        }
        return acc;
      }, new Map<string, ICallLog>()).values()
    ).sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [logs]);

  if (isLoading) {
    return (
      <div className="card flex flex-col items-center justify-center py-20 gap-4">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }}
        />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Syncing call records...</p>
      </div>
    );
  }

  if (uniqueLogs.length === 0) {
    return (
      <div
        className="card flex flex-col items-center justify-center py-20 gap-3"
        style={{ color: 'var(--text-muted)' }}
      >
        <Phone size={36} strokeWidth={1.2} />
        <p className="text-sm font-medium">No call records found</p>
        <p className="text-xs">Records will appear once calls are synced from the field.</p>
      </div>
    );
  }

  return (
    <div className="table-container shadow-sm border-gray-100">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Sales Agent</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Client / Lead</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Duration</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Status</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Sync Status</th>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-right">Timestamp</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {uniqueLogs.map((log) => {
            const agentName = (log.salesPersonId as any)?.name ?? 'Unknown Agent';
            const leadName  = (log.leadId as any)?.name  ?? 'Unknown';
            const leadPhone = (log.leadId as any)?.phone ?? '';
            const s = STATUS_STYLE[log.status] ?? STATUS_STYLE.default;
            const isManual = !log.syncId || log.syncId === 'MANUAL';

            return (
              <tr key={log._id.toString()} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-sm"
                      style={{ background: 'var(--brand)' }}
                    >
                      {agentName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      {agentName}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{leadName}</p>
                    {leadPhone && <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{leadPhone}</p>}
                  </div>
                </td>

                <td className="px-6 py-5 text-center">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm"
                    style={{ background: '#f3f1ff', color: 'var(--brand)' }}
                  >
                    <Clock size={13} />
                    {formatDuration(log.duration || 0)}
                  </span>
                </td>

                <td className="px-6 py-5">
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {log.status}
                  </span>
                </td>

                <td className="px-6 py-5">
                  {isManual ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-amber-100" style={{ background: '#fefce8', color: '#854d0e' }}>
                      Manual Entry
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-emerald-100"
                      style={{ background: '#ecfdf5', color: '#059669' }}
                    >
                      <Shield size={11} fill="currentColor" fillOpacity={0.2} /> HW Verified
                    </span>
                  )}
                </td>

                <td className="px-6 py-5 text-right">
                  <div className="flex flex-col items-end">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {new Date(log.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs font-semibold mt-0.5 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
