'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, UserCheck, Eye, MapPin, Globe } from 'lucide-react';
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

  const isAllSelected = leads.length > 0 && leads.every(l => selectedLeads.has(l._id.toString()));

  const columns: Column<ILead>[] = [
    {
      key: 'selection',
      header: (
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleAll();
          }}
          className="w-4 h-4 cursor-pointer accent-brand-600 rounded border-gray-200"
          title="Select / Deselect All Leads"
        />
      ),
      render: (lead) => {
        const isChecked = selectedLeads.has(lead._id.toString());
        return (
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onToggleLead(lead._id.toString(), true);
            }}
            className="w-4 h-4 cursor-pointer accent-brand-600 rounded border-gray-200 transition-all"
          />
        );
      },
      className: "w-12 px-8",
    },
    {
      key: 'name',
      header: 'Client & Contact',
      render: (lead) => (
        <Link href={`/leads/${lead._id}`} className="flex flex-col group/name">
          <span className="text-sm font-bold text-gray-900 group-hover/name:text-indigo-600 transition-colors underline-offset-2 hover:underline">
            {lead.name}
          </span>
          <span className="text-xs font-mono font-medium text-indigo-600">
            {lead.phone || lead.email || 'No phone'}
          </span>
        </Link>
      ),
    },
    {
      key: 'place',
      header: 'Place / Region',
      render: (lead) => {
        const placeVal = lead.region || lead.address || lead.area || '—';
        return (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            {placeVal !== '—' && <MapPin size={13} className="text-slate-400 shrink-0" />}
            <span className="truncate max-w-[140px]">{placeVal}</span>
          </div>
        );
      },
    },
    {
      key: 'company',
      header: 'Organization & Domain',
      render: (lead) => {
        const domainVal = lead.companyDomain || (lead.company?.includes('.') ? lead.company : undefined);
        const compVal = lead.company || '—';
        return (
          <div className="flex flex-col text-xs font-semibold">
            <span className="text-gray-900 font-bold">{compVal}</span>
            {domainVal && (
              <span className="text-[11px] font-mono text-brand-600 flex items-center gap-1">
                <Globe size={11} /> {domainVal}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status & SLA',
      render: (lead) => {
        const isGhost = (lead as any).isGhost || (
          lead.assignedTo &&
          lead.assignedAt &&
          (!lead.lastContactedAt || new Date(lead.lastContactedAt) < new Date(lead.assignedAt)) &&
          lead.status === 'new' &&
          (Date.now() - new Date(lead.assignedAt).getTime() > 24 * 60 * 60 * 1000)
        );

        let slaBadge = null;
        if (isGhost) {
          slaBadge = (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-600 border border-red-200 rounded text-[11px] font-bold animate-pulse">
              👻 Ghost (24h+ Overdue)
            </span>
          );
        } else if (lead.assignedTo && lead.assignedAt && lead.status === 'new' && (!lead.lastContactedAt || new Date(lead.lastContactedAt) < new Date(lead.assignedAt))) {
          const msPassed = Date.now() - new Date(lead.assignedAt).getTime();
          const minsLeft = Math.max(0, Math.ceil((24 * 60 * 60 * 1000 - msPassed) / 60000));
          const hoursLeft = Math.floor(minsLeft / 60);
          const remainingMins = minsLeft % 60;
          const timeString = hoursLeft > 0 ? `${hoursLeft}h ${remainingMins}m left` : `${minsLeft}m left`;
          slaBadge = (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded text-[11px] font-semibold">
              ⏱️ {timeString}
            </span>
          );
        }

        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant={lead.status as any}>
              {lead.status.replace('_', ' ')}
            </Badge>
            {slaBadge}
          </div>
        );
      },
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
        if (isAdmin) {
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
        }
        return <span className="text-xs text-slate-400 font-semibold">—</span>;
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
      onSort={() => {}}
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
