'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Phone, Calendar, Mail, MessageSquare, FileText, CheckCircle2, Clock } from 'lucide-react';

interface Activity {
  _id: string;
  type: string;
  outcome?: string;
  notes: string;
  subject?: string;
  createdAt: string;
  createdBy?: { name: string; avatar?: string } | null;
  leadId?: { name: string; phone?: string; email?: string } | null;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
  call:     { icon: <Phone size={16} />,        color: '#1a73e8', bg: '#e8f0fe', label: 'Call' },
  meeting:  { icon: <Calendar size={16} />,     color: '#0f9d58', bg: '#e6f4ea', label: 'Meeting' },
  email:    { icon: <Mail size={16} />,          color: '#0277bd', bg: '#e3f6fd', label: 'Email' },
  whatsapp: { icon: <MessageSquare size={16} />, color: '#0f9d58', bg: '#e6f4ea', label: 'WhatsApp' },
  note:     { icon: <FileText size={16} />,      color: '#f29900', bg: '#fef7e0', label: 'Note' },
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
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

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c' }}>Activities</h1>
        <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>Call logs, meeting notes, and other interactions</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 12 }}>
            <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 14, color: '#718096' }}>Loading activities...</span>
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0f4f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Phone size={22} style={{ color: '#a0aec0' }} />
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1a202c', margin: '0 0 6px' }}>No activities yet</h3>
            <p style={{ fontSize: 13, color: '#718096', margin: 0 }}>Calls and notes will appear here once you interact with leads.</p>
          </div>
        ) : (
          <div>
            {activities.map((act, idx) => {
              const meta = TYPE_META[act.type] ?? TYPE_META['note'];
              // Safe fallbacks for potentially null populated fields
              const authorName = act.createdBy?.name ?? 'System';
              const leadName   = act.leadId?.name ?? 'Unknown Lead';
              const isSystem   = !act.createdBy;

              return (
                <div key={act._id}
                  style={{ display: 'flex', gap: 16, padding: '18px 22px', borderBottom: idx < activities.length - 1 ? '1px solid #f0f4f9' : 'none', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fc')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>

                  {/* Icon */}
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: meta.color }}>
                    {meta.icon}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Top row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                      <p style={{ fontSize: 14, color: '#4a5568', margin: 0, lineHeight: 1.5 }}>
                        <strong style={{ color: '#1a202c' }}>{authorName}</strong>
                        {isSystem ? ' sent an automated ' : ' logged a '}
                        <span style={{ display: 'inline-block', background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 100, textTransform: 'capitalize', verticalAlign: 'middle' }}>
                          {meta.label}
                        </span>
                        {act.leadId && (
                          <> with <strong style={{ color: '#1a202c' }}>{leadName}</strong></>
                        )}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#a0aec0', flexShrink: 0 }}>
                        <Clock size={12} />
                        {new Date(act.createdAt).toLocaleString()}
                      </div>
                    </div>

                    {/* Outcome badge */}
                    {act.outcome && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                        <CheckCircle2 size={13} style={{ color: '#0f9d58' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0f9d58', textTransform: 'capitalize' }}>
                          {act.outcome.replace(/_/g, ' ')}
                        </span>
                      </div>
                    )}

                    {/* Subject (for emails) */}
                    {act.subject && (
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#4a5568', margin: '0 0 4px' }}>
                        📧 {act.subject}
                      </p>
                    )}

                    {/* Notes */}
                    {act.notes && (
                      <div style={{ marginTop: 6, padding: '10px 14px', background: '#f7f8fc', border: '1px solid #f0f4f9', borderRadius: 8, fontSize: 13, color: '#4a5568', lineHeight: 1.6, borderLeft: `3px solid ${meta.color}` }}>
                        {act.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '14px 22px', borderTop: '1px solid #f0f4f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary">Previous</button>
            <span style={{ fontSize: 13, color: '#718096' }}>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary">Next</button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
