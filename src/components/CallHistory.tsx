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
    <div className="mt-12">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Phone className="w-5 h-5 text-indigo-500" />
        </div>
        Past Call Interactions
      </h3>

      {logs.length === 0 ? (
        <div className="bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 p-10 text-center">
           <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mx-auto mb-3">
             <Phone className="w-5 h-5 text-gray-300" />
           </div>
           <p className="text-gray-500 font-medium tracking-tight">No calls recorded for this lead.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const style = OUTCOME_STYLES[log.outcome] || { label: log.outcome || log.status, bg: 'bg-gray-100', text: 'text-gray-600' };
            return (
              <div key={log._id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                      <Phone className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 font-bold text-sm tracking-tight">{formatDate(log.startedAt)}</span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black tracking-widest shadow-sm ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-400" /> {formatDuration(log.duration)}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                        <span className="flex items-center gap-1.5 uppercase tracking-tighter text-[10px] font-bold">
                          By <span className="text-indigo-600">{log.salesPersonId.name}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {log.recordingUrl && (
                    <a
                      href={log.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-4 py-2 rounded-xl transition-all hover:shadow-lg hover:shadow-indigo-100"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Play Recording
                    </a>
                  )}
                </div>

                {log.notes && (
                  <div className="mt-4 text-[13px] text-gray-600 bg-gray-50/50 p-4 rounded-xl border border-gray-100/50 leading-relaxed font-medium italic relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-200 rounded-l-xl" />
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
