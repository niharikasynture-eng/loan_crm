'use client';

import * as React from 'react';
import { Search, Plus, Upload, Download, UserCheck, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  selectedCount: number;
  bulkSelectCount: number;
  onBulkSelectChange: (count: number) => void;
  onBulkAssign: () => void;
  onImport: () => void;
  onExport: () => void;
  onAddLead: () => void;
}

export function LeadFilters({
  search,
  onSearchChange,
  onSearchSubmit,
  selectedCount,
  bulkSelectCount,
  onBulkSelectChange,
  onBulkAssign,
  onImport,
  onExport,
  onAddLead,
}: LeadFiltersProps) {
  const { user } = useAuth();

  const isManager = user?.role === 'manager';
  const isOrgAdmin = user?.role === 'org_admin';
  const canAssign = isOrgAdmin || isManager;
  const canAddLead = isOrgAdmin || isManager;
  const canImportExport = isOrgAdmin || isManager;

  const selectOptions = [
    { label: 'Select Count', value: 0 },
    ...[10, 20, 30, 40, 50].map(n => ({ label: `${n} Leads`, value: n }))
  ];

  return (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <form onSubmit={onSearchSubmit}>
          <Input
            label="Search Clients"
            placeholder="Filter by name or company..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 shadow-sm"
          />
        </form>
      </div>

      {/* Action Area */}
      <div className="flex flex-wrap items-end gap-2.5">
        {/* Quick Select */}
        {canAssign && (
          <div className="flex items-end gap-2 text-center">
            <div className="w-[110px]">
              <Select
                label="Quick Select"
                value={bulkSelectCount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onBulkSelectChange(val);
                  if (val > 0) setTimeout(onBulkAssign, 50);
                }}
                options={[
                  { label: 'Select', value: 0 },
                  ...[10, 20, 30, 40, 50].map(n => ({ label: `${n}`, value: n }))
                ]}
                className="h-11 shadow-sm"
              />
            </div>
            {selectedCount > 0 && (
              <Button
                onClick={onBulkAssign}
                className="h-11 px-6 sm:px-10 bg-brand-600 hover:bg-brand-700 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300"
              >
                <UserCheck size={16} />
                <span className="ml-2 font-bold">Assign {selectedCount}</span>
              </Button>
            )}
          </div>
        )}

        {/* Buttons Group */}
        <div className="flex items-center gap-4">
          {canImportExport && (
            <>
              <Button variant="secondary" onClick={onImport} className="h-11 px-6 py-2 sm:px-10">
                <Upload size={15} /> <span className="ml-2">Import</span>
              </Button>
              <Button variant="secondary" onClick={onExport} className="h-11 px-6 py-2 sm:px-10">
                <Download size={15} /> <span className="ml-2">Export</span>
              </Button>
            </>
          )}

          {canAddLead && (
            <Button onClick={onAddLead} className="h-11 pl-6 pr-10 shadow-md shrink-0 relative flex items-center justify-center min-w-[120px]">
              <span>Add Lead</span>
              <Plus size={14} strokeWidth={2.5} className="absolute right-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div >
  );
}
