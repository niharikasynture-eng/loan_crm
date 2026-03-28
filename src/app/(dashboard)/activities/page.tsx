'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Phone, Calendar, Mail, MessageSquare, FileText, CheckCircle2, Clock } from 'lucide-react';

interface Activity {
  _id: string;
  type: string;
  outcome?: string;
  notes: string;
  createdAt: string;
  createdBy: { name: string; avatar?: string };
  leadId: { name: string; phone?: string; email?: string };
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function loadActivities() {
    setLoading(true);
    try {
      const data = await api.get<{ activities: Activity[]; pages: number }>(`/activities?page=${page}`);
      setActivities(data.activities);
      setTotalPages(data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadActivities();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function getIcon(type: string) {
    switch (type) {
      case 'call': return <Phone className="w-5 h-5 text-indigo-400" />;
      case 'meeting': return <Calendar className="w-5 h-5 text-emerald-400" />;
      case 'email': return <Mail className="w-5 h-5 text-sky-400" />;
      case 'whatsapp': return <MessageSquare className="w-5 h-5 text-green-400" />;
      default: return <FileText className="w-5 h-5 text-amber-400" />;
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Activities</h1>
          <p className="text-[#94a3b8] mt-1 text-sm">Call logs, meeting notes, and other interactions</p>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-[#64748b]">Loading activities...</div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[#0f172a] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#334155]">
              <Phone className="w-6 h-6 text-[#64748b]" />
            </div>
            <h3 className="text-white font-medium mb-1">No activities logged</h3>
            <p className="text-[#64748b] text-sm">Calls and notes will appear here once you interact with leads.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#334155]">
            {activities.map((act) => (
              <div key={act._id} className="p-6 hover:bg-[rgba(30,41,59,0.5)] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0f172a] border border-[#334155] flex items-center justify-center flex-shrink-0">
                    {getIcon(act.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm text-[#cbd5e1]">
                        <span className="font-semibold text-white">{act.createdBy.name}</span> logged a{' '}
                        <span className="capitalize font-medium text-white">{act.type}</span> with{' '}
                        <span className="font-semibold text-white">{act.leadId.name}</span>
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(act.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {act.outcome && (
                      <div className="inline-flex items-center gap-1 mt-1 mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-400 capitalize">
                          {act.outcome.replace('_', ' ')}
                        </span>
                      </div>
                    )}

                    {act.notes && (
                      <div className="mt-2 text-sm text-[#94a3b8] bg-[#0f172a] p-3 rounded-lg border border-[#334155]">
                        {act.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-[#334155] flex justify-between items-center">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm px-3 py-1.5">Previous</button>
            <span className="text-sm text-[#94a3b8]">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm px-3 py-1.5">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
