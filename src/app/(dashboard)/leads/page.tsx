'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { open: openModal, close: closeModal } = useModal();

  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const searchParam = searchParams.get('search') || '';
  const industryParam = searchParams.get('industry') || 'all';
  const regionParam = searchParams.get('region') || 'all';
  const dateRangeParam = searchParams.get('dateRange') || 'all';
  const statusParam = searchParams.get('status') || 'all';
  const assignedToParam = searchParams.get('assignedTo') || 'all';

  const [search, setSearch] = React.useState(searchParam);
  const [industry, setIndustry] = React.useState(industryParam);
  const [region, setRegion] = React.useState(regionParam);
  const [dateRange, setDateRange] = React.useState(dateRangeParam);
  const [status, setStatus] = React.useState(statusParam);
  const [assignedTo, setAssignedTo] = React.useState(assignedToParam);
  const [page, setPage] = React.useState(isNaN(pageParam) || pageParam < 1 ? 1 : pageParam);

  const [selectedLeads, setSelectedLeads] = React.useState<Set<string>>(new Set());
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [orgUsers, setOrgUsers] = React.useState<IUser[]>([]);

  // Sync state when searchParams change (e.g. back navigation)
  React.useEffect(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    setPage(isNaN(p) || p < 1 ? 1 : p);
    setSearch(searchParams.get('search') || '');
    setIndustry(searchParams.get('industry') || 'all');
    setRegion(searchParams.get('region') || 'all');
    setDateRange(searchParams.get('dateRange') || 'all');
    setStatus(searchParams.get('status') || 'all');
    setAssignedTo(searchParams.get('assignedTo') || 'all');
  }, [searchParams]);

  const updateUrl = React.useCallback((overrides: Record<string, string | number>) => {
    const current = {
      page,
      search,
      industry,
      region,
      dateRange,
      status,
      assignedTo,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (current.page && current.page > 1) params.set('page', String(current.page));
    if (current.search) params.set('search', current.search);
    if (current.industry && current.industry !== 'all') params.set('industry', current.industry);
    if (current.region && current.region !== 'all') params.set('region', current.region);
    if (current.dateRange && current.dateRange !== 'all') params.set('dateRange', current.dateRange);
    if (current.status && current.status !== 'all') params.set('status', current.status);
    if (current.assignedTo && current.assignedTo !== 'all') params.set('assignedTo', current.assignedTo);

    const str = params.toString();
    const targetUrl = str ? `/leads?${str}` : '/leads';
    router.push(targetUrl);
  }, [page, search, industry, region, dateRange, status, assignedTo, router]);

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
          onSearchChange={(v) => { setSearch(v); updateUrl({ search: v, page: 1 }); }}
          onSearchSubmit={handleSearchSubmit}
          industry={industry}
          onIndustryChange={(v) => { setIndustry(v); updateUrl({ industry: v, page: 1 }); }}
          region={region}
          onRegionChange={(v) => { setRegion(v); updateUrl({ region: v, page: 1 }); }}
          dateRange={dateRange}
          onDateRangeChange={(v) => { setDateRange(v); updateUrl({ dateRange: v, page: 1 }); }}
          status={status}
          onStatusChange={(v) => { setStatus(v); updateUrl({ status: v, page: 1 }); }}
          assignedTo={assignedTo}
          onAssignedToChange={(v) => { setAssignedTo(v); updateUrl({ assignedTo: v, page: 1 }); }}
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
            updateUrl({ page: 1, search: '', industry: 'all', region: 'all', dateRange: 'all', status: 'all', assignedTo: 'all' });
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
          <Button variant="secondary" onClick={() => { const p = Math.max(1, page - 1); setPage(p); updateUrl({ page: p }); }} disabled={page === 1}>
            Previous
          </Button>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>
            Page <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{page}</span> of {totalPages}
          </span>
          <Button variant="secondary" onClick={() => { const p = page + 1; setPage(p); updateUrl({ page: p }); }} disabled={page === totalPages}>
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

export default function LeadsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin border-indigo-600" />
        </div>
      }
    >
      <LeadsContent />
    </React.Suspense>
  );
}
