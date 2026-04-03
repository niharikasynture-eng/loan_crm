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

  if (loading) return <div className="text-gray-400 text-sm py-4 animate-pulse italic">Loading call history...</div>;

  if (!Array.isArray(logs)) return <div className="text-red-500 text-sm py-4 font-bold uppercase tracking-tight">System Error: Failed to load history</div>;

  return (
    <div className="mt-8">
      <h3 className="text-md font-extrabold text-gray-900 mb-6 flex items-center gap-2">
        <div className="w-1 h-5 bg-indigo-500 rounded-full" />
        Follow-up History
      </h3>

      {logs.length === 0 ? (
        <div className="bg-gray-50/30 rounded-2xl border border-dashed border-gray-100 p-8 text-center">
           <p className="text-xs text-gray-400 font-medium italic">No previous calls logged yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const style = OUTCOME_STYLES[log.outcome] || { label: log.outcome || log.status, bg: 'bg-gray-100', text: 'text-gray-600' };
            return (
              <div key={log._id} className="bg-white border border-gray-100/80 rounded-2xl p-4 transition-all hover:shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 items-center justify-center bg-gray-50 rounded-xl flex">
                      <Phone className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-bold text-xs">{formatDate(log.startedAt)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] uppercase font-black tracking-widest ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                         <span>{formatDuration(log.duration)}</span>
                         <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                         <span>By {log.salesPersonId.name}</span>
                      </div>
                    </div>
                  </div>

                  {log.recordingUrl && (
                    <a
                      href={log.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                      title="Play Recording"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </a>
                  )}
                </div>

                {log.notes && (
                  <div className="mt-3 text-[12px] text-gray-500 bg-gray-50/50 p-3 rounded-lg border border-gray-100/50 italic leading-snug">
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
