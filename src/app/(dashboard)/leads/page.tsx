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
import { Select } from '@/components/ui/Select';
import { ILead } from '@/models/Lead';
import { IUser } from '@/models/User';

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { open: openModal, close: closeModal } = useModal();

  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selectedLeads, setSelectedLeads] = React.useState<Set<string>>(new Set());
  const [bulkSelectCount, setBulkSelectCount] = React.useState(0);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [orgUsers, setOrgUsers] = React.useState<IUser[]>([]);

  const debouncedSearch = useDebounce(search, 300);

  // Data fetching
  const { leads, loading, refresh, total } = useLeads({
    search: debouncedSearch,
    limit: 10,
    skip: (page - 1) * 10
  });

  const totalPages = Math.ceil(total / 10);

  // Fetch users for assignment
  React.useEffect(() => {
    api.get<{ users: IUser[] }>('/users?role=sales_agent,onsite_visitor')
      .then(d => setOrgUsers(d.users))
      .catch(console.error);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refresh();
  };

  const handleToggleLead = (id: string, isSelectable: boolean) => {
    if (!isSelectable) return;
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeads(next);
  };

  const handleToggleAll = () => {
    const selectableLeads = leads.filter(l => !l.assignedTo && l.status === 'new');
    if (selectedLeads.size === selectableLeads.length && selectableLeads.length > 0) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(selectableLeads.map(l => l._id.toString())));
    }
  };

  const handleBulkSelectChange = (count: number) => {
    setBulkSelectCount(count);
    if (count === 0) {
      setSelectedLeads(new Set());
    } else {
      const selectable = leads.filter(l => !l.assignedTo && l.status === 'new');
      setSelectedLeads(new Set(selectable.slice(0, count).map(l => l._id.toString())));
    }
  };

  // --- Assign Modal ---
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
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Select Responsible Team Member</p>
            <AgentSelector
              agents={orgUsers}
              selectedId={selectedAgent}
              onSelect={setSelectedAgent}
            />
          </div>

          <Button
            size="lg"
            className="w-full h-14 text-lg shadow-lg shadow-brand-500/20"
            isLoading={isAssigning}
            disabled={!selectedAgent}
            onClick={async () => {
              setIsAssigning(true);
              try {
                await api.patch(`/leads/${lead._id}`, { assignedTo: selectedAgent });
                toast('success', `Assigned to ${orgUsers.find(u => u._id.toString() === selectedAgent)?.name}`);
                refresh();
                closeModal();
              } catch (err: any) {
                toast('error', err.message || 'Assignment failed');
              } finally {
                setIsAssigning(false);
              }
            }}
          >
            Assign Client
          </Button>
        </div>
      );
    };

    openModal({
      title: 'Direct Assignment',
      content: <AssignContent />,
      size: 'md'
    });
  };

  // --- Bulk Assign Modal ---
  const handleBulkAssign = () => {
    const BulkAssignContent = () => {
      const [selectedAgent, setSelectedAgent] = React.useState('');
      const [isAssigning, setIsAssigning] = React.useState(false);

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Batch Size</p>
              <p className="text-xl font-bold text-gray-900">{selectedLeads.size}</p>
            </div>
            <div className="p-6 bg-brand-50 rounded-xl border border-brand-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-1">Target</p>
              <p className="text-xl font-bold text-brand-900 truncate">Bulk Clients</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Option 1: Assign to Specific Agent</p>
            <AgentSelector
              agents={orgUsers}
              selectedId={selectedAgent}
              onSelect={setSelectedAgent}
            />
          </div>

          <Button
            size="lg"
            className="w-full h-12 text-base"
            isLoading={isAssigning}
            disabled={!selectedAgent}
            onClick={async () => {
              setIsAssigning(true);
              try {
                await api.patch('/leads/bulk', {
                  leadIds: Array.from(selectedLeads),
                  assignedTo: selectedAgent
                });
                toast('success', `Successfully assigned ${selectedLeads.size} clients`);
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
            Assign to Selected Agent
          </Button>

          <div className="relative py-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <span className="relative px-3 bg-white text-xs font-bold text-gray-400 uppercase tracking-widest">OR</span>
          </div>

          <Button
            size="lg"
            variant="secondary"
            className="w-full h-12 text-base text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
            isLoading={isAssigning}
            onClick={async () => {
              setIsAssigning(true);
              try {
                await api.post('/leads/auto-route', {
                  leadIds: Array.from(selectedLeads)
                });
                toast('success', `Successfully auto-routed ${selectedLeads.size} leads using Smart Lead Routing`);
                setSelectedLeads(new Set());
                refresh();
                closeModal();
              } catch (err: any) {
                toast('error', err.message || 'Auto-routing failed');
              } finally {
                setIsAssigning(false);
              }
            }}
          >
            ⚡ Auto-Distribute (Smart Round Robin)
          </Button>
        </div>
      );
    };

    openModal({
      title: 'Bulk Client Assignment',
      content: <BulkAssignContent />,
      size: 'md'
    });
  };

  // --- Deletion Dialog ---
  const handleDelete = (lead: ILead) => {
    openModal({
      title: 'Archive Lead',
      content: (
        <p className="text-sm text-gray-500 font-medium leading-relaxed">
          Are you sure you want to archive <span className="font-bold text-gray-900">"{lead.name}"</span>?
          This will hide associated data from the active pipeline.
        </p>
      ),
      footer: (
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={closeModal}>Keep Record</Button>
          <Button variant="danger" onClick={async () => {
            try {
              await api.delete(`/leads/${lead._id}`);
              toast('success', 'Lead archived');
              refresh();
              closeModal();
            } catch (err: any) {
              toast('error', err.message || 'Deletion failed');
            }
          }}>Archive Lead</Button>
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
        'Status': l.status,
        'Source': l.source,
        'Assigned To': (l as any).assignedTo?.name || 'Unassigned',
        'Created': new Date(l.createdAt).toLocaleDateString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, `leads_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast('success', 'Export completed');
    } catch (err) { toast('error', 'Export failed'); }
  };

  return (
    <div className="animate-fade-in pb-10 flex flex-col gap-8">
      <PageHeader
        title="Lead Intelligence"
        subtitle="Global view of all inbound and qualified opportunities"
      />

      {/* Filters Card */}
      <div className="card">
        <LeadFilters
          search={search}
          onSearchChange={setSearch}
          onSearchSubmit={handleSearchSubmit}
          selectedCount={selectedLeads.size}
          bulkSelectCount={bulkSelectCount}
          onBulkSelectChange={handleBulkSelectChange}
          onBulkAssign={handleBulkAssign}
          onImport={() => setIsImportOpen(true)}
          onExport={handleExport}
          onAddLead={() => router.push('/leads/new')}
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
