'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Phone, Clock, User, ClipboardList } from 'lucide-react';

interface CallLog {
  _id: string;
  leadId: string;
  salesPersonId: { _id: string; name: string };
  status: string;
  outcome: string | null;
  duration: number;
  connectedDuration?: number;
  notes: string;
  startedAt: string;
}

interface CallHistoryProps {
  leadId: string;
}

const OUTCOME_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'interested': { bg: 'bg-[#dcfce7]', text: 'text-green-800', border: 'border-green-200' },
  'callback': { bg: 'bg-[#dbeafe]', text: 'text-blue-800', border: 'border-blue-200' },
  'not-interested': { bg: 'bg-[#fee2e2]', text: 'text-red-800', border: 'border-red-200' },
  'no-answer': { bg: 'bg-[#f3f4f6]', text: 'text-gray-800', border: 'border-gray-200' },
  'busy': { bg: 'bg-[#fef9c3]', text: 'text-yellow-800', border: 'border-yellow-200' },
  'wrong-number': { bg: 'bg-[#ffedd5]', text: 'text-orange-800', border: 'border-orange-200' },
};

export default function CallHistory({ leadId }: CallHistoryProps) {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get<{ calls: CallLog[] }>(`/calls/history/${leadId}`);
        setCalls(res.calls);
      } catch (err) {
        console.error('Failed to fetch call history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [leadId]);

  const formatTime = (seconds?: number) => {
    if (!seconds && seconds !== 0) return 'Not recorded';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: true
    }).format(d);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse bg-gray-50 rounded-2xl p-4 border border-gray-100 flex gap-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm mx-auto mb-3">
          <Phone className="w-5 h-5 text-gray-300" />
        </div>
        <p className="text-sm font-bold text-gray-500">No calls logged yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-4">
        <Phone className="w-3.5 h-3.5" /> Call History
      </h3>
      
      {calls.map(call => {
        const style = call.outcome && OUTCOME_STYLES[call.outcome] 
          ? OUTCOME_STYLES[call.outcome] 
          : { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-transparent' };
          
        return (
          <div key={call._id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{call.salesPersonId?.name || 'System'}</span>
                    {call.outcome && (
                      <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 rounded-md border ${style.bg} ${style.text} ${style.border}`}>
                        {call.outcome.replace('-', ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                    {formatDate(call.startedAt)}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100" title="Total Dialing Duration">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-bold text-gray-600 tracking-wider font-mono">
                    Dial: {formatTime(call.duration)}
                  </span>
                </div>
                {call.connectedDuration !== undefined && call.connectedDuration > 0 && (
                  <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded border border-emerald-100" title="Actual Talk Time">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-700 tracking-wider font-mono">
                      Talk: {formatTime(call.connectedDuration)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {call.notes && (
              <div className="mt-2 pl-13">
                <div className="text-sm text-gray-600 bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex items-start gap-2">
                  <ClipboardList className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <p>{call.notes}</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
