'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Plus, GripVertical, DollarSign } from 'lucide-react';

interface Lead {
  _id: string;
  name: string;
  company?: string;
  value?: number;
  status: string;
  pipelineStage: string;
  assignedTo?: { name: string };
}

const STAGES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
];

export default function LeadPipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLeads() {
    try {
      const data = await api.get<{ leads: Lead[] }>('/leads?limit=200');
      setLeads(data.leads);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeads();
  }, []);

  async function updateLeadStage(leadId: string, newStage: string) {
    // Optimistic update
    const optimisticLeads = leads.map(l => l._id === leadId ? { ...l, status: newStage, pipelineStage: newStage } : l);
    setLeads(optimisticLeads);
    
    try {
      await api.patch(`/leads/${leadId}`, { 
        status: newStage,
        pipelineStage: newStage 
      });
    } catch {
      loadLeads(); // revert on fail
    }
  }

  function handleDragStart(e: React.DragEvent, leadId: string) {
    e.dataTransfer.setData('leadId', leadId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, stageId: string) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) {
      updateLeadStage(leadId, stageId);
    }
  }

  if (loading) return <div className="p-8 text-[#94a3b8]">Loading pipeline...</div>;

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Sales Pipeline</h1>
          <p className="text-[#94a3b8] mt-1 text-sm">Drag and drop leads to update status</p>
        </div>
        <Link href="/leads" className="btn-primary">
          <Plus className="w-4 h-4" />
          Add Lead
        </Link>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 flex-1 items-start custom-scrollbar">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter(l => (l.pipelineStage || l.status) === stage.id);
          const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);

          return (
            <div
              key={stage.id}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="p-4 border-b border-[#334155] flex justify-between items-center sticky top-0 bg-[#1e293b] rounded-t-xl z-20">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full bg-${stage.id === 'won' ? 'emerald' : stage.id === 'lost' ? 'red' : 'indigo'}-500`} />
                  {stage.label} 
                  <span className="text-xs ml-1 text-[#94a3b8] py-0.5 px-2 bg-[#0f172a] rounded-full">{stageLeads.length}</span>
                </h3>
                <p className="text-xs text-[#10b981] font-mono">${stageValue.toLocaleString()}</p>
              </div>
              
              <div className="p-2 flex-1 overflow-y-auto min-h-[300px] space-y-3">
                {stageLeads.map((lead) => (
                  <div
                    key={lead._id}
                    className="kanban-card group hover:scale-[1.02] transition-transform cursor-grab active:cursor-grabbing shadow-lg"
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead._id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Link href={`/leads/${lead._id}`} className="font-semibold text-white group-hover:text-indigo-400 transition-colors truncate block">
                        {lead.name}
                      </Link>
                      <GripVertical className="w-4 h-4 text-[#475569] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm mb-3">
                      <DollarSign className="w-3.5 h-3.5" />
                      {(lead.value || 0).toLocaleString()}
                    </div>
                    
                    <div className="pt-3 border-t border-[#334155] mt-auto flex justify-between items-center">
                      <p className="text-[11px] text-[#64748b] truncate flex-1 uppercase tracking-wider">{lead.company || 'Individual'}</p>
                      {lead.assignedTo && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[9px] font-bold text-indigo-300 flex-shrink-0 ml-2" title={lead.assignedTo.name}>
                          {lead.assignedTo.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {stageLeads.length === 0 && (
                  <div className="h-full flex items-center justify-center py-10 opacity-30 select-none">
                    <p className="text-xs text-[#475569] text-center border-2 border-dashed border-[#334155] rounded-xl p-6 w-full italic">No leads in {stage.label}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
