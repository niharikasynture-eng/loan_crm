'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, UserCheck, Eye } from 'lucide-react';
import { Table, Column } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { ILead } from '@/models/Lead';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/cn';

interface LeadTableProps {
  leads: ILead[];
  loading: boolean;
  selectedLeads: Set<string>;
  onToggleLead: (id: string, isSelectable: boolean) => void;
  onToggleAll: () => void;
  onAssignLead: (lead: ILead) => void;
  onDeleteLead: (lead: ILead) => void;
}

export function LeadTable({
  leads,
  loading,
  selectedLeads,
  onToggleLead,
  onToggleAll,
  onAssignLead,
  onDeleteLead,
}: LeadTableProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'org_admin' || user?.role === 'super_admin' || user?.role === 'manager';

  const selectableLeads = leads.filter(l => !l.assignedTo && l.status === 'new');
  const isAllSelected = leads.length > 0 && selectedLeads.size === selectableLeads.length && selectableLeads.length > 0;

  const columns: Column<ILead>[] = [
    {
      key: 'selection',
      header: '',
      render: (lead) => {
        const isSelectable = !lead.assignedTo && lead.status === 'new';
        return (
          <input
            type="checkbox"
            disabled={!isSelectable}
            checked={selectedLeads.has(lead._id.toString())}
            onChange={(e) => {
              e.stopPropagation();
              onToggleLead(lead._id.toString(), isSelectable);
            }}
            className={cn(
              "w-4 h-4 cursor-pointer accent-brand-600 rounded border-gray-200 transition-all",
              !isSelectable && "opacity-20 cursor-not-allowed"
            )}
          />
        );
      },
      className: "w-12 px-8",
    },
    {
      key: 'name',
      header: 'Client Details',
      render: (lead) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">
            {lead.name}
          </span>
          <span className="text-xs font-medium text-gray-400 tabular-nums">
            {lead.email || lead.phone || 'No contact info'}
          </span>
        </div>
      ),
    },
    {
      key: 'company',
      header: 'Organization',
      render: (lead) => (
        <span className="text-sm font-semibold text-gray-500">
          {lead.company || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (lead) => (
        <Badge variant={lead.status as any}>
          {lead.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (lead) => (
        <span className="text-xs font-black uppercase tracking-widest text-gray-400">
          {lead.source}
        </span>
      ),
    },
    {
      key: 'assignment',
      header: 'Responsible',
      render: (lead) => {
        if (lead.assignedTo) {
          return (
            <div className="flex items-center gap-2">
              <Avatar name={(lead as any).assignedTo.name} size="sm" />
              <span className="text-xs font-bold text-gray-600">
                {(lead as any).assignedTo.name.split(' ')[0]}
              </span>
            </div>
          );
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-[10px] font-black uppercase tracking-widest"
            onClick={(e) => {
              e.stopPropagation();
              onAssignLead(lead);
            }}
          >
            <UserCheck size={12} /> Assign
          </Button>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      render: (lead) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/leads/${lead._id}`);
            }}
          >
            <Eye size={16} />
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-danger-600 hover:bg-danger-50"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteLead(lead);
              }}
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      ),
      className: "text-right px-8",
    },
  ];

  return (
    <Table<ILead>
      columns={columns}
      data={leads}
      isLoading={loading}
      onSort={() => {}} // TODO: Implement sorting in hook
      className="bg-white p-4 sm:p-6 shadow-sm rounded-xl"
      emptyState={
        <div className="py-20 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
            <UserCheck size={32} />
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">No Leads Found</p>
            <p className="text-sm text-gray-500">Adjust your search or add a new record.</p>
          </div>
        </div>
      }
    />
  );
}
