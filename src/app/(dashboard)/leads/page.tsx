'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useToast } from '@/hooks/useToast';
import { useModal } from '@/hooks/useModal';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/layout/PageHeader';
import { LeadFilters } from '@/components/features/LeadFilters';
import { LeadTable } from '@/components/features/LeadTable';
import { LeadImportModal } from '@/components/features/LeadImportModal';
import { AgentSelector } from '@/components/features/AgentSelector';
import { Button } from '@/components/ui/Button';
import { ILead } from '@/models/Lead';
import { IUser } from '@/models/User';

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { open: openModal, close: closeModal } = useModal();

  const [search, setSearch] = React.useState('');
  const [industry, setIndustry] = React.useState('all');
  const [region, setRegion] = React.useState('all');
  const [dateRange, setDateRange] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [assignedTo, setAssignedTo] = React.useState('all');
  const [page, setPage] = React.useState(1);
  const [selectedLeads, setSelectedLeads] = React.useState<Set<string>>(new Set());
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [orgUsers, setOrgUsers] = React.useState<IUser[]>([]);

  const debouncedSearch = useDebounce(search, 300);

  // Data fetching
  const { leads, loading, refresh, total } = useLeads({
    search: debouncedSearch,
    industry,
    region,
    dateRange,
    status,
    assignedTo,
    limit: 10,
    skip: (page - 1) * 10
  });

  const totalPages = Math.ceil(total / 10);

  // Fetch users for assignment & filtering
  React.useEffect(() => {
    api.get<{ users: IUser[] }>('/users?role=sales_agent,onsite_visitor,manager')
      .then(d => setOrgUsers(d.users))
      .catch(console.error);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refresh();
  };

  const handleToggleLead = (id: string) => {
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeads(next);
  };

  const handleToggleAll = () => {
    if (selectedLeads.size === leads.length && leads.length > 0) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(l => l._id.toString())));
    }
  };

  // --- Assign Single Lead Modal (Admins & Managers) ---
  const handleAssign = (lead: ILead) => {
    const AssignContent = () => {
      const [selectedAgent, setSelectedAgent] = React.useState('');
      const [isAssigning, setIsAssigning] = React.useState(false);

      return (
        <div className="space-y-6">
          <div className="bg-brand-50 p-6 rounded-xl border border-brand-100">
            <p className="text-sm text-brand-900 font-bold mb-1">Target Account</p>
            <p className="text-lg font-bold text-gray-900">{lead.name}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Select Responsible Sales Agent</p>
            <AgentSelector
              agents={orgUsers}
              selectedId={selectedAgent}
              onSelect={setSelectedAgent}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button
              disabled={!selectedAgent || isAssigning}
              onClick={async () => {
                setIsAssigning(true);
                try {
                  await api.patch(`/leads/${lead._id}`, { assignedTo: selectedAgent });
                  toast('success', 'Lead assigned successfully');
                  refresh();
                  closeModal();
                } catch (err: any) {
                  toast('error', err.message || 'Assignment failed');
                } finally {
                  setIsAssigning(false);
                }
              }}
            >
              {isAssigning ? 'Updating Ownership...' : 'Confirm Assignment'}
            </Button>
          </div>
        </div>
      );
    };

    openModal({
      title: 'Reassign Account Ownership',
      content: <AssignContent />
    });
  };

  // --- Bulk Assign Dialog ---
  const handleBulkAssign = () => {
    if (selectedLeads.size === 0) return;

    const BulkAssignContent = () => {
      const [selectedAgent, setSelectedAgent] = React.useState('');
      const [isAssigning, setIsAssigning] = React.useState(false);

      return (
        <div className="space-y-6">
          <div className="bg-brand-50 p-6 rounded-xl border border-brand-100">
            <p className="text-sm text-brand-900 font-bold mb-1">Bulk Assignment Queue</p>
            <p className="text-2xl font-black text-brand-700">{selectedLeads.size} Accounts Selected</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Target Sales Agent</p>
            <AgentSelector
              agents={orgUsers}
              selectedId={selectedAgent}
              onSelect={setSelectedAgent}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button
              disabled={!selectedAgent || isAssigning}
              onClick={async () => {
                setIsAssigning(true);
                try {
                  const leadIdArray = Array.from(selectedLeads);
                  const res = await api.patch<{ modifiedCount: number }>('/leads/bulk', {
                    leadIds: leadIdArray,
                    assignedTo: selectedAgent
                  });
                  toast('success', `Successfully reassigned ${res.modifiedCount || leadIdArray.length} leads`);
                  setSelectedLeads(new Set());
                  refresh();
                  closeModal();
                } catch (err: any) {
                  toast('error', err.message || 'Bulk assignment failed');
                } finally {
                  setIsAssigning(false);
                }
              }}
            >
              {isAssigning ? 'Reassigning Accounts...' : 'Execute Bulk Reassignment'}
            </Button>
          </div>
        </div>
      );
    };

    openModal({
      title: 'Bulk Reassign Accounts',
      content: <BulkAssignContent />
    });
  };

  // --- Bulk Delete Dialog ---
  const handleBulkDelete = () => {
    if (selectedLeads.size === 0) return;

    openModal({
      title: 'Delete Selected Leads',
      content: (
        <p className="text-sm text-gray-600 font-medium leading-relaxed">
          Are you sure you want to permanently delete <span className="font-bold text-rose-600">{selectedLeads.size} selected lead(s)</span>? This action cannot be undone.
        </p>
      ),
      footer: (
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="danger" onClick={async () => {
            try {
              const leadIdArray = Array.from(selectedLeads);
              const res = await api.delete<{ deletedCount: number }>('/leads/bulk', {
                leadIds: leadIdArray
              });
              toast('success', `Successfully deleted ${res.deletedCount || leadIdArray.length} lead(s)`);
              setSelectedLeads(new Set());
              refresh();
              closeModal();
            } catch (err: any) {
              toast('error', err.message || 'Deletion failed');
            }
          }}>
            Delete Selected Leads
          </Button>
        </div>
      )
    });
  };

  // --- Single Deletion Dialog ---
  const handleDelete = (lead: ILead) => {
    openModal({
      title: 'Delete Lead',
      content: (
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-gray-900">"{lead.name}"</span>?
        </p>
      ),
      footer: (
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="danger" onClick={async () => {
            try {
              await api.delete(`/leads/${lead._id}`);
              toast('success', 'Lead deleted');
              refresh();
              closeModal();
            } catch (err: any) {
              toast('error', err.message || 'Deletion failed');
            }
          }}>Delete Lead</Button>
        </div>
      )
    });
  };

  // --- Export ---
  const handleExport = async () => {
    try {
      const data = await api.get<{ leads: ILead[] }>('/leads?page=1&limit=9999');
      const XLSX = await import('xlsx');
      const rows = data.leads.map(l => ({
        'Name': l.name,
        'Email': l.email || '',
        'Phone': l.phone || '',
        'Company': l.company || '',
        'Region/Place': l.region || l.address || '',
        'Company Domain': l.companyDomain || '',
        'Status': l.status,
        'Source': l.source,
        'Added By': (l as any).createdBy?.name || 'System / Admin',
        'Assigned To': (l as any).assignedTo?.name || 'Unassigned',
        'Created': new Date(l.createdAt).toLocaleDateString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, `Leads_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err: any) {
      toast('error', 'Export failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Lead Intelligence"
        subtitle="Global view of all inbound and qualified opportunities"
      />

      {/* Filters Card */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-sm">
        <LeadFilters
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          onSearchSubmit={handleSearchSubmit}
          industry={industry}
          onIndustryChange={(v) => { setIndustry(v); setPage(1); }}
          region={region}
          onRegionChange={(v) => { setRegion(v); setPage(1); }}
          dateRange={dateRange}
          onDateRangeChange={(v) => { setDateRange(v); setPage(1); }}
          status={status}
          onStatusChange={(v) => { setStatus(v); setPage(1); }}
          assignedTo={assignedTo}
          onAssignedToChange={(v) => { setAssignedTo(v); setPage(1); }}
          agents={orgUsers}
          selectedCount={selectedLeads.size}
          onBulkAssign={handleBulkAssign}
          onBulkDelete={handleBulkDelete}
          onImport={() => setIsImportOpen(true)}
          onExport={handleExport}
          onAddLead={() => router.push('/leads/new')}
          onResetFilters={() => {
            setSearch('');
            setIndustry('all');
            setRegion('all');
            setDateRange('all');
            setStatus('all');
            setAssignedTo('all');
            setPage(1);
          }}
        />
      </div>

      <LeadTable
        leads={leads}
        loading={loading}
        selectedLeads={selectedLeads}
        onToggleLead={handleToggleLead}
        onToggleAll={handleToggleAll}
        onAssignLead={handleAssign}
        onDeleteLead={handleDelete}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <Button variant="secondary" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
            Previous
          </Button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Page <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{page}</span> of {totalPages}
          </span>
          <Button variant="secondary" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      )}

      {/* Feature Modals */}
      <LeadImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={refresh}
      />
    </div>
  );
}
