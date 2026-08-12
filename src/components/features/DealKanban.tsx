'use client';

import * as React from 'react';
import Link from 'next/link';
import { GripVertical, IndianRupee } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ILead } from '@/models/Lead';
import { cn } from '@/lib/cn';

interface DealKanbanProps {
  leads: ILead[];
  onStageChange: (leadId: string, newStage: string) => void;
}

const STAGES = [
  { id: 'new', label: 'New', color: 'bg-brand-500' },
  { id: 'contacted', label: 'Contacted', color: 'bg-info-500' },
  { id: 'qualified', label: 'Qualified', color: 'bg-warning-500' },
  { id: 'proposal', label: 'Proposal', color: 'bg-purple-500' },
  { id: 'won', label: 'Won', color: 'bg-success-500' },
  { id: 'lost', label: 'Lost', color: 'bg-danger-500' },
];

export function DealKanban({ leads, onStageChange }: DealKanbanProps) {
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (leadId) onStageChange(leadId, stageId);
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 items-start no-scrollbar min-h-[calc(100vh-250px)]">
      {STAGES.map((stage) => {
        const stageLeads = leads.filter(l => (l.pipelineStage || l.status) === stage.id);
        const stageValue = stageLeads.reduce((sum, l) => sum + (l.value || 0), 0);

        return (
          <div
            key={stage.id}
            className="flex-shrink-0 w-80 flex flex-col gap-4"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 leading-none">
                  {stage.label}
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  {stageLeads.length}
                </span>
              </div>
              <span className="text-xs font-bold text-success-600 tabular-nums">
                ₹{stageValue.toLocaleString()}
              </span>
            </div>

            {/* Leads List */}
            <div className={cn(
              "flex-1 flex flex-col gap-3 p-3 rounded-card transition-colors duration-200 min-h-[150px]",
              "bg-gray-50/50 border-2 border-dashed border-transparent hover:border-gray-200"
            )}>
              {stageLeads.map((lead) => (
                <Card
                  key={lead._id.toString()}
                  padding="sm"
                  className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all group border-gray-100"
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead._id.toString())}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Link 
                      href={`/leads/${lead._id}`}
                      className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors truncate max-w-[130px]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {lead.name}
                    </Link>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      <select
                        value={stage.id}
                        onChange={(e) => onStageChange(lead._id.toString(), e.target.value)}
                        className="text-[10px] font-bold py-0.5 px-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-indigo-400 focus:outline-none cursor-pointer shadow-2xs"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <GripVertical size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-success-600 font-bold text-xs mb-3">
                    <IndianRupee size={12} />
                    {(lead.value || 0).toLocaleString()}
                  </div>

                  <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate max-w-[120px]">
                      {lead.company || 'Individual'}
                    </span>
                    {lead.assignedTo && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-lg bg-brand-50 flex items-center justify-center text-[9px] font-black text-brand-600 border border-brand-100 uppercase" title={`Assigned to ${(lead as any).assignedTo.name}`}>
                          {(lead as any).assignedTo.name.charAt(0)}
                        </div>
                      </div>
                    )}
                  </div>

                  {lead.lastStageChangedBy && (
                    <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-[9px] shrink-0 uppercase shadow-2xs">
                          {(lead.lastStageChangedBy as any).avatar ? (
                            <img src={(lead.lastStageChangedBy as any).avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            (lead.lastStageChangedBy as any).name ? (lead.lastStageChangedBy as any).name.charAt(0) : 'U'
                          )}
                        </div>
                        <span className="font-semibold text-slate-700 text-[11px] truncate">
                          {(lead.lastStageChangedBy as any).name || 'Sales Agent'}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1 bg-slate-100/80 px-2 py-0.5 rounded-full border border-slate-200/60">
                        <span className="capitalize">{lead.previousStage || 'new'}</span>
                        <span className="text-slate-400">→</span>
                        <span className="font-bold text-indigo-600 capitalize">{stage.label}</span>
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {stageLeads.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-10 opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">
                    Drop leads here
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
