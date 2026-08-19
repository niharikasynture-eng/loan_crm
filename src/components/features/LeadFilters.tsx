'use client';

import * as React from 'react';
import { Search, Plus, Upload, Download, UserCheck, Calendar, Filter, RotateCcw, Building2, MapPin, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  industry: string;
  onIndustryChange: (value: string) => void;
  region: string;
  onRegionChange: (value: string) => void;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  assignedTo?: string;
  onAssignedToChange?: (value: string) => void;
  agents?: Array<{ _id: any; name: string; email: string }>;
  selectedCount: number;
  onBulkAssign?: () => void;
  onBulkDelete?: () => void;
  onImport: () => void;
  onExport: () => void;
  onAddLead: () => void;
  onResetFilters?: () => void;
}

const DOMAINS = [
  { label: 'All Categories', value: 'all' },
  { label: 'Finance / Financial Services', value: 'FINANCE' },
  { label: 'Jewellery / Gems & Ornaments', value: 'Jewellery' },
  { label: 'Banking & Financial', value: 'Banking' },
  { label: 'Healthcare / Hospital', value: 'Healthcare' },
  { label: 'Educational Institute', value: 'Educational' },
  { label: 'Real Estate / Construction', value: 'Real Estate' },
  { label: 'IT / Tech / Software', value: 'IT' },
  { label: 'Manufacturing / Industrial', value: 'Manufacturing' },
  { label: 'Retail / E-commerce', value: 'Retail' },
  { label: 'Hospitality / Hotel', value: 'Hospitality' },
  { label: 'Corporate / Enterprise', value: 'Corporate' },
  { label: 'Government', value: 'Government' },
  { label: 'Other Category', value: 'Other' },
];

const REGIONS = [
  { label: 'All Regions', value: 'all' },
  { label: 'North Pune (Chakan/Bhosari)', value: 'North' },
  { label: 'South Pune (Katraj/Kondhwa)', value: 'South' },
  { label: 'East Pune (Kharadi/Viman Nagar)', value: 'East' },
  { label: 'West Pune (Baner/Hinjawadi)', value: 'West' },
  { label: 'Central Pune (Shivajinagar/FC Rd)', value: 'Central' },
  { label: 'Pimpri-Chinchwad (PCMC)', value: 'Pimpri-Chinchwad' },
  { label: 'Outskirts / Rural', value: 'Outskirts' },
];

const DATE_RANGES = [
  { label: 'All Time', value: 'all' },
  { label: 'Created Today', value: 'today' },
  { label: 'Created Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'This Month', value: 'thisMonth' },
];

const STATUSES = [
  { label: 'All Statuses', value: 'all' },
  { label: 'New', value: 'new' },
  { label: 'Contacted', value: 'contacted' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Proposal', value: 'proposal' },
  { label: 'Won', value: 'won' },
  { label: 'Lost', value: 'lost' },
];

export function LeadFilters({
  search,
  onSearchChange,
  onSearchSubmit,
  industry,
  onIndustryChange,
  region,
  onRegionChange,
  dateRange,
  onDateRangeChange,
  status,
  onStatusChange,
  assignedTo,
  onAssignedToChange,
  agents = [],
  selectedCount,
  onBulkAssign,
  onBulkDelete,
  onImport,
  onExport,
  onAddLead,
  onResetFilters,
}: LeadFiltersProps) {
  const { user } = useAuth();

  const userRole = (user?.role || '').toLowerCase();
  const isSalesPersonOnly = userRole === 'sales_agent' || userRole === 'onsite_visitor';

  const canAddLead = userRole !== 'super_admin';
  const canImportExport = userRole !== 'super_admin';
  const canAssign = userRole === 'org_admin' || userRole === 'manager' || userRole === 'super_admin';
  const showAgentFilter = Boolean(onAssignedToChange) && !isSalesPersonOnly;

  const agentOptions = React.useMemo(() => {
    const list = [{ label: 'All Sales Agents', value: 'all' }];
    agents.forEach((a) => {
      list.push({ label: `${a.name}${a.email ? ` (${a.email})` : ''}`, value: a._id.toString() });
    });
    return list;
  }, [agents]);

  const hasActiveFilters = (industry && industry !== 'all') || 
                           (region && region !== 'all') || 
                           (dateRange && dateRange !== 'all') || 
                           (status && status !== 'all') || 
                           (assignedTo && assignedTo !== 'all') ||
                           !!search;

  return (
    <div className="space-y-5">
      {/* Top Header Row: Search Input + Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="flex-1 max-w-xl">
          <form onSubmit={onSearchSubmit} className="relative">
            <Input
              label=""
              placeholder="Search by client name, company, phone..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-11 pl-11 pr-4 shadow-sm rounded-xl text-xs font-medium bg-slate-50/50 focus:bg-white transition-all"
            />
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </form>
        </div>

        {/* Right Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Action Buttons: Visible when 1+ items selected */}
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 animate-fade-in">
              {canAssign && onBulkAssign && (
                <Button
                  onClick={onBulkAssign}
                  className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700 shadow-sm text-xs font-bold rounded-xl text-white flex items-center gap-1.5"
                >
                  <UserCheck size={16} />
                  <span>Assign Lead ({selectedCount})</span>
                </Button>
              )}

              {onBulkDelete && (
                <Button
                  onClick={onBulkDelete}
                  className="h-11 px-4 bg-rose-600 hover:bg-rose-700 shadow-sm text-xs font-bold rounded-xl text-white flex items-center gap-1.5"
                >
                  <Trash2 size={16} />
                  <span>Delete Lead ({selectedCount})</span>
                </Button>
              )}
            </div>
          )}

          {canImportExport && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onImport} className="h-11 px-4 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700">
                <Upload size={14} className="text-brand-600" /> <span className="ml-1.5 font-bold">Import</span>
              </Button>
              <Button variant="secondary" onClick={onExport} className="h-11 px-4 rounded-xl text-xs font-bold border-slate-200 hover:bg-slate-50 text-slate-700">
                <Download size={14} className="text-brand-600" /> <span className="ml-1.5 font-bold">Export</span>
              </Button>
            </div>
          )}

          {canAddLead && (
            <Button onClick={onAddLead} className="h-11 px-6 shadow-md shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2">
              <Plus size={16} strokeWidth={2.5} />
              <span>Add Lead</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Options Container Box */}
      <div className="pt-4 border-t border-slate-100">
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showAgentFilter ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
          {/* Sales Agent Filter */}
          {showAgentFilter && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-0.5">
                <User size={13} className="text-violet-600" /> Sales Agent / Member
              </label>
              <Select
                value={assignedTo || 'all'}
                onChange={(e) => onAssignedToChange && onAssignedToChange(e.target.value)}
                options={agentOptions}
                className="h-11 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white transition-all w-full"
              />
            </div>
          )}

          {/* Category / Domain Filter */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-0.5">
              <Building2 size={13} className="text-indigo-500" /> Category / Domain
            </label>
            <Select
              value={industry}
              onChange={(e) => onIndustryChange(e.target.value)}
              options={DOMAINS}
              className="h-11 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white transition-all w-full"
            />
          </div>

          {/* Pune Region Filter */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-0.5">
              <MapPin size={13} className="text-emerald-500" /> Pune Region
            </label>
            <Select
              value={region}
              onChange={(e) => onRegionChange(e.target.value)}
              options={REGIONS}
              className="h-11 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white transition-all w-full"
            />
          </div>

          {/* Date Added Filter */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-0.5">
              <Calendar size={13} className="text-amber-500" /> Date Added
            </label>
            <Select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
              options={DATE_RANGES}
              className="h-11 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white transition-all w-full"
            />
          </div>

          {/* Pipeline Status Filter */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-0.5">
              <Filter size={13} className="text-indigo-500" /> Pipeline Status
            </label>
            <Select
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              options={STATUSES}
              className="h-11 text-xs font-semibold rounded-xl border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white transition-all w-full"
            />
          </div>
        </div>

        {/* Active Filters Clear Bar */}
        {hasActiveFilters && (
          <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
              <Filter size={13} /> Active filters applied
            </span>
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
            >
              <RotateCcw size={13} /> Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
