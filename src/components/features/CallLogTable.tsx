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
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Sales Agent</th>
            <th>Client / Lead</th>
            <th className="text-center">Duration</th>
            <th>Status</th>
            <th>Sync</th>
            <th className="text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {uniqueLogs.map((log) => {
            const agentName = (log.salesPersonId as any)?.name ?? 'Unknown Agent';
            const leadName  = (log.leadId as any)?.name  ?? 'Unknown';
            const leadPhone = (log.leadId as any)?.phone ?? '';
            const s = STATUS_STYLE[log.status] ?? STATUS_STYLE.default;
            const isManual = !log.syncId || log.syncId === 'MANUAL';

            return (
              <tr key={log._id.toString()}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'var(--brand)' }}
                    >
                      {agentName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {agentName}
                    </span>
                  </div>
                </td>

                <td>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{leadName}</p>
                  {leadPhone && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{leadPhone}</p>}
                </td>

                <td className="text-center">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: '#f3f1ff', color: 'var(--brand)' }}
                  >
                    <Clock size={12} />
                    {formatDuration(log.duration || 0)}
                  </span>
                </td>

                <td>
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {log.status}
                  </span>
                </td>

                <td>
                  {isManual ? (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#fef9c3', color: '#854d0e' }}>
                      Manual
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                      style={{ background: '#ecfdf5', color: 'var(--success)' }}
                    >
                      <Shield size={10} /> HW Verified
                    </span>
                  )}
                </td>

                <td className="text-right">
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {new Date(log.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(log.startedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
