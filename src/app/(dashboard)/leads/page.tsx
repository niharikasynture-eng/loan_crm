'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, UserCheck, Upload, Download, X, CheckCircle, AlertCircle, FileSpreadsheet, Filter, Phone, Trash2, Calendar, Bell, ChevronDown } from 'lucide-react';
import CallButton from '@/components/CallButton';

interface Lead {
  _id: string; name: string; email: string; phone: string; company: string;
  status: string; source: string; createdAt: string;
  assignedTo?: { _id: string; name: string; avatar?: string };
}
interface OrgUser { _id: string; name: string; role: string; }

export default function LeadsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [assignModal, setAssignModal] = useState<Lead | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [deleteModal, setDeleteModal] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Assignment state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [bulkAssignModal, setBulkAssignModal] = useState(false);

  const isManager = user?.role === 'manager';
  const isOrgAdmin = user?.role === 'org_admin';
  const isSalesAgent = user?.role === 'sales_agent';
  const canAddLead = isOrgAdmin || isManager;
  const canAssign = isOrgAdmin || isManager;
  const canImportExport = isOrgAdmin || isManager;

  // Import/Export state
  const [importModal, setImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [bulkSelectCount, setBulkSelectCount] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ leads: Lead[]; pages: number }>(`/leads?page=${page}&search=${search}`);
      setLeads(data.leads); setTotalPages(data.pages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { loadLeads(); }, [loadLeads, page]);

  useEffect(() => {
    if (canAssign) {
      api.get<{ users: OrgUser[] }>('/users?role=sales_agent,onsite_visitor').then((d) => setOrgUsers(d.users)).catch(console.error);
    }
  }, [canAssign]);

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); loadLeads(); }

  // ── EXPORT ── Downloads all leads as Excel
  async function handleExport() {
    try {
      const data = await api.get<{ leads: Lead[] }>('/leads?page=1&limit=9999');
      const XLSX = await import('xlsx');
      const rows = data.leads.map(l => ({
        'Name': l.name,
        'Email': l.email || '',
        'Phone': l.phone || '',
        'Company': l.company || '',
        'Status': l.status,
        'Source': l.source,
        'Assigned To': l.assignedTo?.name || 'Unassigned',
        'Created': new Date(l.createdAt).toLocaleDateString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, `leads_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) { console.error('Export failed:', err); alert('Export failed. Please try again.'); }
  }

  // ── IMPORT ── Parses Excel/CSV and bulk creates leads
  async function handleImportFile(file: File) {
    setImporting(true);
    setImportResult(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      const HEADER_MAP: Record<string, string> = {
        'name': 'name', 'full name': 'name', 'client name': 'name', 'customer name': 'name',
        'phone': 'phone', 'phone number': 'phone', 'contact': 'phone', 'mobile': 'phone', 'mobile number': 'phone',
        'email': 'email', 'email address': 'email',
        'company': 'company', 'organization': 'company', 'company name': 'company',
        'source': 'source', 'lead source': 'source',
        'secondary phone': 'secondaryPhone', 'alternate phone': 'secondaryPhone',
        'address': 'address', 'location': 'address',
        'flat no': 'flatNo', 'flat number': 'flatNo', 'apartment': 'flatNo',
        'landmark': 'landmark',
        'area': 'area', 'locality': 'area',
        'pincode': 'pincode', 'postal code': 'pincode', 'zip code': 'pincode',
        'income': 'income', 'annual income': 'income',
        'occupation': 'occupation', 'job': 'occupation', 'profession': 'occupation',
        'education': 'education',
        'date of visit': 'dateOfVisit', 'visit date': 'dateOfVisit',
        'time of visit': 'timeOfVisit', 'visit time': 'timeOfVisit',
        'map link': 'mapLink', 'google maps': 'mapLink', 'location link': 'mapLink',
        'tse name': 'tseName',
        'tl name': 'tlName',
      };

      let success = 0; const errors: string[] = [];
      for (const row of rows) {
        const leadData: any = { customFields: {} };
        const usedKeys = new Set<string>();

        // 1. Extract and Map fields
        Object.keys(row).forEach(key => {
          const lowerKey = key.toLowerCase().trim();
          const mappedField = HEADER_MAP[lowerKey];

          if (mappedField) {
            leadData[mappedField] = row[key]?.toString().trim();
            usedKeys.add(key);
          }
        });

        // 2. Put everything else in customFields
        Object.keys(row).forEach(key => {
          if (!usedKeys.has(key)) {
            leadData.customFields[key] = row[key];
          }
        });

        // 3. Validate main fields
        if (!leadData.name && !leadData.phone) {
          errors.push(`Row skipped: Missing Name and Phone`);
          continue;
        }
        if (!leadData.name) {
          errors.push(`Row skipped: Phone ${leadData.phone} has no Name`);
          continue;
        }
        if (!leadData.phone) {
          errors.push(`Row skipped: ${leadData.name} has no Phone Number`);
          continue;
        }

        try {
          await api.post('/leads', {
            ...leadData,
            source: leadData.source || 'Import',
            status: 'new',
          });
          success++;
        } catch (e: any) {
          errors.push(`"${leadData.name || 'Unknown'}": ${e.message}`);
        }
      }
      setImportResult({ success, failed: errors.length, errors: errors.slice(0, 10) });
      if (success > 0) loadLeads();
    } catch (err) {
      setImportResult({ success: 0, failed: 1, errors: ['Could not parse file. Please use the template format.'] });
    } finally { setImporting(false); }
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
  }

  async function handleAssign() {
    if (!assignModal || !assignTo) return;
    setAssigning(true);
    try {
      await api.patch(`/leads/${assignModal._id}`, { assignedTo: assignTo });
      setAssignModal(null); setAssignTo(''); loadLeads();
    } catch (err) { console.error(err); }
    finally { setAssigning(false); }
  }

  const toggleLead = (id: string, isSelectable: boolean = true) => {
    if (!isSelectable) return;
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedLeads(next);
  };

  const handleBulkSelect = (count: number) => {
    setBulkSelectCount(count);
    if (count === 0) {
      setSelectedLeads(new Set());
      return;
    }
    const selectableLeads = leads.filter(l => !l.assignedTo && l.status === 'new');
    const toSelect = selectableLeads.slice(0, count);
    setSelectedLeads(new Set(toSelect.map(l => l._id)));
  };

  const toggleAll = () => {
    const selectableLeads = leads.filter(l => !l.assignedTo && l.status === 'new');
    if (selectedLeads.size === selectableLeads.length && selectableLeads.length > 0) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(selectableLeads.map(l => l._id)));
    }
  };

  async function handleBulkAssign() {
    if (selectedLeads.size === 0 || !assignTo) return;
    setAssigning(true);
    try {
      await api.patch('/leads/bulk', {
        leadIds: Array.from(selectedLeads),
        assignedTo: assignTo
      });
      setBulkAssignModal(false);
      setAssignTo('');
      setSelectedLeads(new Set());
      loadLeads();
    } catch (err) { console.error(err); }
    finally { setAssigning(false); }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await api.delete(`/leads/${deleteModal._id}`);
      setDeleteModal(null);
      loadLeads();
    } catch (err) {
      console.error(err);
      alert('Failed to delete lead. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
    new: { bg: '#e8f0fe', color: '#1a73e8' },
    contacted: { bg: '#e3f6fd', color: '#0277bd' },
    qualified: { bg: '#e6f4ea', color: '#0f9d58' },
    won: { bg: '#e6f4ea', color: '#0f9d58' },
    lost: { bg: '#fce8e6', color: '#d93025' },
    unqualified: { bg: '#fef7e0', color: '#f29900' },
  };

  function StatusBadge({ status }: { status: string }) {
    const s = STATUS_BADGE[status] || STATUS_BADGE['new'];
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {status.replace('_', ' ')}
      </span>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto space-y-8 animate-fade-in py-2 pb-32 bg-transparent min-h-screen">
      
      {/* ── TITLE BLOCK ── */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mb-1">Lead Central</h1>
        <p className="text-xs text-slate-500 font-medium tracking-tight">Global view of all inbound and qualified opportunities</p>
      </div>

      {/* ── ACTION TOOLBAR (Row 3) ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2">
         {/* Search Bar */}
         <div className="flex-1 max-w-2xl">
           <form onSubmit={handleSearch} className="flex items-center gap-4">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  placeholder="Search leads..." 
                  className="block w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm" 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
              </div>

              {/* Conditional Bulk Actions */}
              {(isManager || isOrgAdmin) && canAssign && (
                <div className="flex items-center gap-3">
                  {/* Selection Count Filter */}
                  <div className="relative group">
                    <select 
                      value={bulkSelectCount}
                      onChange={(e) => handleBulkSelect(Number(e.target.value))}
                      className="appearance-none pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-[12px] font-bold text-slate-600 cursor-pointer shadow-sm hover:border-slate-300 transition-all focus:outline-none"
                    >
                       <option value={0}>Select Count</option>
                       {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(n => (
                         <option key={n} value={n}>{n} Leads</option>
                       ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>

                  {selectedLeads.size > 0 && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setBulkAssignModal(true); setAssignTo(''); }}
                      className="flex items-center gap-2 px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md shadow-emerald-50 active:scale-95 animate-in zoom-in-95 duration-200"
                    >
                      <UserCheck size={14} /> Assign {selectedLeads.size} Leads
                    </button>
                  )}
                </div>
              )}
           </form>
         </div>

         {/* Right Side Actions */}
         <div className="flex items-center gap-3">
            {canImportExport && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setImportModal(true); setImportResult(null); }}
                  className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <Upload size={14} /> Import
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <Download size={14} /> Export
                </button>
              </div>
            )}
            
            {canAddLead && (
              <Link
                href="/leads/new"
                className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-50 active:scale-95"
              >
                <Plus size={16} strokeWidth={2.5} /> Add Lead
              </Link>
            )}
         </div>
      </div>

      {/* ── MAIN TABLE CARD ── */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        {loading ? (
          <div className="py-40 flex flex-col items-center justify-center gap-6">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Accessing Lead Pipeline...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr className="bg-white border-b border-slate-100">
                  <th className="px-8 py-5 text-left w-12 border-b border-slate-50">
                    <input
                      type="checkbox"
                      onChange={toggleAll}
                      checked={leads.length > 0 && Array.from(selectedLeads).length === leads.filter(l => !l.assignedTo && l.status === 'new').length && selectedLeads.size > 0}
                      className="w-4 h-4 cursor-pointer accent-indigo-600 rounded-lg border-slate-200 transition-all"
                    />
                  </th>
                  {['Client Details', 'Organization', 'Status', 'Source', 'Activity', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-50 text-left first:pl-2">
                       {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-40 text-center bg-slate-50/20">
                      <div className="flex flex-col items-center gap-5">
                        <div className="w-20 h-20 rounded-[32px] bg-white border border-slate-100 shadow-inner flex items-center justify-center text-slate-200">
                          <AlertCircle size={32} />
                        </div>
                        <div>
                          <p className="text-xl font-black text-slate-900 tracking-tight mb-2">No Leads Identified</p>
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Adjust your filters or add a new record</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : leads.map((lead) => {
                  const isSelectable = !lead.assignedTo && lead.status === 'new';
                  return (
                    <tr key={lead._id}
                      className={`group hover:bg-slate-50/80 transition-all duration-300 cursor-pointer ${selectedLeads.has(lead._id) ? 'bg-indigo-50/40' : 'bg-white'}`}
                      onClick={() => router.push(`/leads/${lead._id}`)}
                    >
                      <td className="px-8 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          disabled={!isSelectable}
                          checked={selectedLeads.has(lead._id)}
                          onChange={() => toggleLead(lead._id, isSelectable)}
                          className={`w-4 h-4 cursor-pointer accent-indigo-600 rounded-lg border-slate-200 bg-white transition-all ${!isSelectable && 'opacity-20 cursor-not-allowed'}`}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[14px] font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors tracking-tight">{lead.name}</span>
                          <span className="text-[12px] font-medium text-slate-400 tabular-nums">{lead.email || lead.phone || 'No contact'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[13px] font-medium text-slate-500 tracking-tight">{lead.company || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100/50 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                           {lead.status.replace('_', ' ')}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[12px] font-medium text-slate-400 tracking-wide">{lead.source}</span>
                      </td>
                      <td className="px-6 py-4">
                         {lead.assignedTo ? (
                           <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                              <div className="w-4 h-4 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold">
                                {lead.assignedTo.name.charAt(0)}
                              </div>
                              <span className="text-[11px] font-bold uppercase tracking-tight leading-none">Assigned to {lead.assignedTo.name.split(' ')[0]}</span>
                           </div>
                         ) : (
                           <button
                             onClick={(e) => { e.stopPropagation(); setAssignModal(lead); setAssignTo(''); }}
                             className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/30 text-[11px] font-bold uppercase tracking-tight hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                           >
                             <UserCheck size={12} /> Assign Client
                           </button>
                         )}
                      </td>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-4">
                          <Link
                            href={`/leads/${lead._id}`}
                            className="text-[12px] font-bold text-indigo-600 hover:underline transition-all tracking-tight whitespace-nowrap"
                          >
                            View Details
                          </Link>
                          {(isManager || isOrgAdmin) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteModal(lead); }}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="Archive Lead"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── PAGINATION ── */}
        {totalPages > 1 && (
          <div className="px-12 py-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
            <button 
               disabled={page === 1} 
               onClick={(e) => { e.stopPropagation(); setPage(p => p - 1); }} 
               className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-400 disabled:opacity-30 transition-all shadow-sm"
            >
              Previous
            </button>
            <div className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl shadow-sm text-[12px] font-black text-slate-400 tabular-nums uppercase">
              Page <span className="text-slate-900">{page}</span> of {totalPages}
            </div>
            <button 
               disabled={page === totalPages} 
               onClick={(e) => { e.stopPropagation(); setPage(p => p + 1); }} 
               className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-400 disabled:opacity-30 transition-all shadow-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── MODALS (Design Updated) ── */}

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-8 flex items-center gap-4 border-b border-slate-50">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                <UserCheck size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-1.5">Assign Client</h2>
                <p className="text-[13px] text-slate-400 font-medium tracking-tight">Assigning: <span className="font-semibold text-slate-900">{assignModal.name}</span></p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Agent Assignment</label>
                <div className="relative">
                  <select 
                    className="w-full pl-5 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[14px] font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 transition-all appearance-none cursor-pointer" 
                    value={assignTo} 
                    onChange={(e) => setAssignTo(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {orgUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setAssignModal(null)} className="flex-1 px-6 py-3.5 bg-slate-50 text-slate-500 text-[12px] font-bold uppercase tracking-wider rounded-2xl hover:bg-slate-100 transition-all">Cancel</button>
                <button onClick={handleAssign} disabled={assigning} className="flex-1 px-6 py-3.5 bg-indigo-600 text-white text-[12px] font-bold uppercase tracking-wider rounded-2xl hover:bg-indigo-700 shadow-md shadow-indigo-100 active:scale-95 transition-all">
                  {assigning ? 'Confirming...' : 'Assign Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {bulkAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-8 flex items-center gap-4 border-b border-slate-50">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                <UserCheck size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-1.5">Bulk Member Sync</h2>
                <p className="text-[13px] text-slate-400 font-medium">Syncing <span className="text-emerald-600 font-semibold">{selectedLeads.size} leads</span> to agent.</p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Agent Assignment</label>
                <div className="relative">
                  <select className="w-full pl-5 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[14px] font-medium text-slate-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-400 transition-all appearance-none cursor-pointer" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    {orgUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setBulkAssignModal(false)} className="flex-1 px-6 py-3.5 bg-slate-50 text-slate-500 text-[12px] font-bold uppercase tracking-wider rounded-2xl hover:bg-slate-100 transition-all">Cancel</button>
                <button onClick={handleBulkAssign} disabled={assigning || !assignTo} className="flex-1 px-6 py-3.5 bg-emerald-600 text-white text-[12px] font-bold uppercase tracking-wider rounded-2xl hover:bg-emerald-700 shadow-md shadow-emerald-50 active:scale-95 transition-all">
                  {assigning ? 'Syncing...' : 'Bulk Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-10 py-8 border-b border-slate-50">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                  <FileSpreadsheet size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Import Intelligence</h2>
                  <p className="text-[14px] text-slate-400 font-medium">Upload Excel (.xlsx) or CSV format</p>
                </div>
              </div>
              <button
                onClick={() => { setImportModal(false); setImportResult(null); }}
                className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-10">
              {!importResult && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative rounded-[40px] border-4 border-dashed p-14 text-center cursor-pointer transition-all duration-500 ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 bg-slate-50 hover:border-indigo-400/50 hover:bg-indigo-50/20'}`}
                >
                  {importing ? (
                    <div className="flex flex-col items-center gap-5">
                      <div className="w-14 h-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                      <p className="text-[14px] font-black text-indigo-600 uppercase tracking-widest">Processing Batch...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                      <div className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-inner ${dragOver ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-300 border border-slate-50'}`}>
                        <Upload size={32} />
                      </div>
                      <div>
                        <p className="text-xl font-black text-slate-900 tracking-tight">Drop your lead file here</p>
                        <p className="text-[13px] text-slate-400 mt-2 font-medium">or <span className="text-indigo-600 font-black uppercase tracking-widest">browse files</span> — .xlsx, .csv</p>
                      </div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />
                </div>
              )}

              {importResult && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-[32px] p-8 text-center shadow-inner">
                      <CheckCircle size={32} className="text-emerald-500 mx-auto mb-4" />
                      <p className="text-5xl font-black text-emerald-600 tabular-nums">{importResult.success}</p>
                      <p className="text-[12px] font-black text-emerald-500 mt-2 uppercase tracking-widest">Imported Successfully</p>
                    </div>
                    {importResult.failed > 0 && (
                      <div className="bg-red-50/50 border border-red-100 rounded-[32px] p-8 text-center shadow-inner">
                        <AlertCircle size={32} className="text-red-500 mx-auto mb-4" />
                        <p className="text-5xl font-black text-red-500 tabular-nums">{importResult.failed}</p>
                        <p className="text-[12px] font-black text-red-500 mt-2 uppercase tracking-widest">Failed Records</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setImportResult(null)}
                    className="text-sm font-black text-indigo-600 hover:underline uppercase tracking-widest"
                  >
                    ← Upload Another Batch
                  </button>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-100 rounded-[32px] p-8">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">📋 Schema Support Guide:</p>
                <div className="flex gap-3 flex-wrap mb-6">
                  {['Name *', 'Phone *', 'Email', 'Company', 'Source', 'Address', '...'].map(col => (
                    <code key={col} className={`text-[11px] px-3.5 py-1.5 rounded-xl font-mono border shadow-sm ${col.includes('*') ? 'bg-indigo-50 border-indigo-200 text-indigo-600 font-black' : 'bg-white border-slate-100 text-slate-400'}`}>{col}</code>
                  ))}
                </div>
                <div className="space-y-4">
                  <p className="text-[12px] text-slate-900 font-bold leading-relaxed px-4 border-l-4 border-indigo-500">* Required Fields: Name and Phone are essential for duplicate prevention and outreach.</p>
                  <p className="text-[12px] text-slate-400 font-medium leading-relaxed px-4 border-l-4 border-slate-200 ml-4">Advanced Mapping: Our AI automatically correlates columns. Unrecognized data is preserved in custom fields.</p>
                </div>
              </div>
            </div>

            <div className="px-10 py-8 border-t border-slate-50 flex justify-end">
              <button
                onClick={() => { setImportModal(false); setImportResult(null); }}
                className="px-8 py-4 text-[13px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-[28px] transition-all"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md overflow-hidden">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl border border-slate-100 p-10 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[32px] bg-red-50 flex items-center justify-center mb-6 shadow-inner text-red-500">
                <Trash2 size={36} strokeWidth={2.5} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-4">Archive Record?</h2>
              <p className="text-base text-slate-400 font-medium mb-10 leading-relaxed px-2">
                This will permanently archive <span className="font-black text-slate-900">"{deleteModal.name}"</span>. Associated call history and activity logs will be hidden from the pipeline.
              </p>
              
              <div className="grid grid-cols-2 gap-4 w-full">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="px-8 py-5 text-[13px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-[28px] transition-all active:scale-95"
                >
                  Keep
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-8 py-5 text-[13px] font-black uppercase tracking-widest text-white bg-red-500 hover:bg-red-600 rounded-[28px] shadow-lg shadow-red-100 transition-all active:scale-95"
                >
                  {deleting ? 'Removing...' : 'Archive'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
