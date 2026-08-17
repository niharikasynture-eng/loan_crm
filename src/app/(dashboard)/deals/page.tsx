'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, IndianRupee } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useLeads } from '@/hooks/useLeads';
import { useToast } from '@/hooks/useToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/cn';

const STAGES = [
  { id: 'new',       label: 'New',       color: '#6d28d9' },
  { id: 'contacted', label: 'Contacted', color: '#2563eb' },
  { id: 'qualified', label: 'Qualified', color: '#d97706' },
  { id: 'proposal',  label: 'Proposal',  color: '#7c3aed' },
  { id: 'won',       label: 'Won',       color: '#059669' },
  { id: 'lost',      label: 'Lost',      color: '#dc2626' },
];

export default function DealsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { leads, loading, refresh } = useLeads({ limit: 1000 });
  const [dragging, setDragging] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Auto-trigger stale deal cleanup SLA check on mount
    api.get('/cron/stale-deals').catch((err) => console.error('Stale deal check error:', err));
  }, []);

  const handleDrop = async (stageId: string, leadId: string) => {
    try {
      await api.patch(`/leads/${leadId}`, { pipelineStage: stageId, status: stageId });
      if (stageId === 'won' || stageId === 'closed_won') {
        toast('success', '🎉 Deal Closed Won! Post-Sales SAP Contract initiated.');
      } else {
        toast('success', `Moved to ${stageId}`);
      }
      refresh();
    } catch {
      toast('error', 'Failed to update pipeline stage');
    }
    setDragging(null);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Sales Pipeline"
        subtitle="Drag leads across stages to update their status"
        action={
          <button className="btn-primary text-sm" onClick={() => router.push('/leads/new')}>
            <Plus size={15} /> Add Lead
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--brand-light)', borderTopColor: 'var(--brand)' }}
          />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start" style={{ minHeight: 'calc(100vh - 220px)' }}>
          {STAGES.map((stage) => {
            const stageLeads = leads.filter(l => (l.pipelineStage || l.status) === stage.id);
            const totalVal = stageLeads.reduce((s, l) => s + (l.value || 0), 0);

            return (
              <div
                key={stage.id}
                className="shrink-0 w-64 flex flex-col gap-3"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('leadId');
                  if (id) handleDrop(stage.id, id);
                }}
              >
                {/* Column header */}
                <div
                  className="flex items-center justify-between px-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: stage.color }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                      {stage.label}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: '#f3f4f6', color: 'var(--text-muted)' }}
                    >
                      {stageLeads.length}
                    </span>
                  </div>
                  {totalVal > 0 && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                      ₹{(totalVal / 1000).toFixed(0)}K
                    </span>
                  )}
                </div>

                {/* Cards */}
                <div
                  className="flex flex-col gap-2.5 p-2 rounded-xl min-h-[100px] transition-colors"
                  style={{ background: dragging ? '#f5f3ff' : '#f8f9fc', border: '1.5px dashed', borderColor: dragging ? 'var(--brand-light)' : 'var(--border)' }}
                >
                  {stageLeads.map(lead => {
                    const isStale = (lead as any).isStale;
                    const lostReason = (lead as any).lostReason || '';
                    const isUnresponsiveArchived = stage.id === 'lost' && lostReason.toLowerCase().includes('unresponsive');

                    return (
                      <div
                        key={lead._id.toString()}
                        draggable
                        onDragStart={e => { e.dataTransfer.setData('leadId', lead._id.toString()); setDragging(lead._id.toString()); }}
                        onDragEnd={() => setDragging(null)}
                        className={`card px-3 py-3 cursor-grab active:cursor-grabbing hover:shadow-card-hover transition-all relative ${
                          isStale ? 'border-red-300 bg-red-50/20' : ''
                        }`}
                      >
                        {isStale && (
                          <div className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-wider animate-pulse">
                            ⚠️ Stale (14d+ Inactive)
                          </div>
                        )}
                        {isUnresponsiveArchived && (
                          <div className="mb-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 text-[9px] font-black uppercase tracking-wider">
                            🕸️ Auto-Archived (Unresponsive)
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mb-1">
                          <Link
                            href={`/leads/${lead._id}`}
                            className="block text-sm font-semibold hover:underline truncate max-w-[110px]"
                            style={{ color: 'var(--text-primary)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            {lead.name}
                          </Link>

                          <select
                            value={stage.id}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleDrop(e.target.value, lead._id.toString());
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="text-[10px] font-bold py-0.5 px-1 rounded-md border border-slate-200 bg-white text-slate-700 hover:border-indigo-400 focus:outline-none cursor-pointer shrink-0"
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {lead.value ? (
                          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--success)' }}>
                            <IndianRupee size={11} /> {(lead.value).toLocaleString()}
                          </div>
                        ) : null}
                        <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--text-muted)' }}>
                          {(lead as any).company || (lead as any).assignedTo?.name || '—'}
                        </p>

                        {(lead as any).lastStageChangedBy && (
                          <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-[9px] shrink-0 uppercase shadow-2xs">
                                {(lead as any).lastStageChangedBy.avatar ? (
                                  <img src={(lead as any).lastStageChangedBy.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  (lead as any).lastStageChangedBy.name ? (lead as any).lastStageChangedBy.name.charAt(0) : 'U'
                                )}
                              </div>
                              <span className="font-semibold text-slate-700 text-[11px] truncate">
                                {(lead as any).lastStageChangedBy.name || 'Sales Agent'}
                              </span>
                            </div>

                            <div className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200/60">
                              <span className="capitalize">{(lead as any).previousStage || 'new'}</span>
                              <span className="text-slate-400">→</span>
                              <span className="font-bold text-indigo-600 capitalize">{stage.label}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {stageLeads.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                        Drop leads here
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
