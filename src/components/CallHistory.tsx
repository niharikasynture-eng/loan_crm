'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Phone, Clock, Play } from 'lucide-react';

interface CallLog {
  _id: string;
  status: string;
  outcome: string;
  duration: number;
  recordingUrl?: string;
  notes?: string;
  startedAt: string;
  salesPersonId: { name: string };
}

const OUTCOME_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  'interested': { label: 'Interested', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  'callback': { label: 'Call Back', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  'not-interested': { label: 'Not Interested', bg: 'bg-red-500/10', text: 'text-red-400' },
  'no-answer': { label: 'No Answer', bg: 'bg-slate-500/10', text: 'text-slate-400' },
  'busy': { label: 'Busy', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  'wrong-number': { label: 'Wrong Number', bg: 'bg-orange-500/10', text: 'text-orange-400' },
};

export default function CallHistory({ leadId }: { leadId: string }) {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await api.get<CallLog[]>(`/calls/lead/${leadId}`);
        setLogs(data);
      } catch (err) {
        console.error('Failed to fetch call logs:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [leadId]);

  function formatDuration(seconds: number) {
    if (!seconds) return '0 sec';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) return <div className="text-[#64748b] text-sm py-4 animate-pulse italic">Loading call history...</div>;

  if (!Array.isArray(logs)) return <div className="text-red-400 text-sm py-4">Failed to load call history</div>;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Phone className="w-5 h-5 text-indigo-400" />
        Call History
      </h3>

      {logs.length === 0 ? (
        <div className="bg-[#1e293b] rounded-xl border border-dashed border-[#334155] p-8 text-center text-[#64748b]">
           No calls made yet
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const style = OUTCOME_STYLES[log.outcome] || { label: log.outcome || log.status, bg: 'bg-slate-500/10', text: 'text-slate-400' };
            return (
              <div key={log._id} className="bg-[#0f172a] border border-[#334155] rounded-xl p-4 hover:border-slate-500 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-[#1e293b] rounded-lg">
                      <Phone className="w-4 h-4 text-[#64748b]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">{formatDate(log.startedAt)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-[#64748b] font-medium tracking-tight">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDuration(log.duration)}</span>
                        <span className="flex items-center gap-1 uppercase tracking-tighter text-[10px]">By {log.salesPersonId.name}</span>
                      </div>
                    </div>
                  </div>

                  {log.recordingUrl && (
                    <a
                      href={log.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      ▶ Play Recording
                    </a>
                  )}
                </div>

                {log.notes && (
                  <div className="mt-3 text-sm text-[#94a3b8] bg-[#1e293b] p-3 rounded-lg border border-[#334155]/50 leading-relaxed italic">
                    "{log.notes}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
