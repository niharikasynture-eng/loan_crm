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

  const handleDrop = async (stageId: string, leadId: string) => {
    try {
      await api.patch(`/leads/${leadId}`, { pipelineStage: stageId, status: stageId });
      toast('success', `Moved to ${stageId}`);
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
                  {stageLeads.map(lead => (
                    <div
                      key={lead._id.toString()}
                      draggable
                      onDragStart={e => { e.dataTransfer.setData('leadId', lead._id.toString()); setDragging(lead._id.toString()); }}
                      onDragEnd={() => setDragging(null)}
                      className="card px-3 py-3 cursor-grab active:cursor-grabbing hover:shadow-card-hover transition-all"
                    >
                      <Link
                        href={`/leads/${lead._id}`}
                        className="block text-sm font-semibold mb-1 hover:underline"
                        style={{ color: 'var(--text-primary)' }}
                        onClick={e => e.stopPropagation()}
                      >
                        {lead.name}
                      </Link>
                      {lead.value ? (
                        <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--success)' }}>
                          <IndianRupee size={11} /> {(lead.value).toLocaleString()}
                        </div>
                      ) : null}
                      <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {(lead as any).company || (lead as any).assignedTo?.name || '—'}
                      </p>
                    </div>
                  ))}

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
