'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, UserCheck, Upload, Download, X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';

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

  const isManager   = user?.role === 'manager';
  const isOrgAdmin   = user?.role === 'org_admin';
  const isSalesAgent = user?.role === 'sales_agent';
  const canAddLead   = isOrgAdmin || isManager;
  const canAssign    = isOrgAdmin || isManager;
  const canImportExport = isOrgAdmin || isManager;

  // Import/Export state
  const [importModal, setImportModal] = useState(false);
  const [importing, setImporting]     = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver]       = useState(false);
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
      api.get<{ users: OrgUser[] }>('/users?role=sales_agent').then((d) => setOrgUsers(d.users)).catch(console.error);
    }
  }, [canAssign]);

  function handleSearch(e: React.FormEvent) { e.preventDefault(); setPage(1); loadLeads(); }

  // ── EXPORT ── Downloads all leads as Excel
  async function handleExport() {
    try {
      const data = await api.get<{ leads: Lead[] }>('/leads?page=1&limit=9999');
      const XLSX = await import('xlsx');
      const rows = data.leads.map(l => ({
        'Name':        l.name,
        'Email':       l.email || '',
        'Phone':       l.phone || '',
        'Company':     l.company || '',
        'Status':      l.status,
        'Source':      l.source,
        'Assigned To': l.assignedTo?.name || 'Unassigned',
        'Created':     new Date(l.createdAt).toLocaleDateString(),
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads');
      XLSX.writeFile(wb, `leads_export_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (err) { console.error('Export failed:', err); alert('Export failed. Please try again.'); }
  }

  // ── IMPORT ── Parses Excel/CSV and bulk creates leads
  async function handleImportFile(file: File) {
    setImporting(true);
    setImportResult(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb     = XLSX.read(buffer, { type: 'array' });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      let success = 0; const errors: string[] = [];
      for (const row of rows) {
        const name  = row['Name']  || row['name']  || row['Full Name'] || '';
        const email = row['Email'] || row['email'] || '';
        const phone = row['Phone'] || row['phone'] || '';
        if (!name) { errors.push(`Row skipped: missing Name`); continue; }
        try {
          await api.post('/leads', {
            name: name.toString().trim(),
            email: email.toString().trim(),
            phone: phone.toString().trim(),
            company: (row['Company'] || row['company'] || '').toString().trim(),
            source:  (row['Source']  || row['source']  || 'Import').toString().trim(),
            status: 'new',
          });
          success++;
        } catch (e: any) { errors.push(`"${name}": ${e.message}`); }
      }
      setImportResult({ success, failed: errors.length, errors: errors.slice(0, 5) });
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
    <div style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c' }}>{isSalesAgent ? 'My Leads' : 'Leads'}</h1>
          <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>{isSalesAgent ? 'Leads assigned to you' : "Manage and track your organization's leads"}</p>
        </div>
        {/* Buttons row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {canImportExport && (
            <>
              <button onClick={() => { setImportModal(true); setImportResult(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a73e8'; e.currentTarget.style.color = '#1a73e8'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#4a5568'; }}>
                <Upload size={14} /> Import
              </button>
              <button onClick={handleExport}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0f9d58'; e.currentTarget.style.color = '#0f9d58'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#4a5568'; }}>
                <Download size={14} /> Export
              </button>
            </>
          )}
          {canAddLead && (
            <Link href="/leads/new" className="btn-primary"><Plus size={15} /> Add Lead</Link>
          )}
        </div>
      </div>

      {/* Table Card */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {/* Search */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f9' }}>
          <form onSubmit={handleSearch} style={{ position: 'relative', maxWidth: 360 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
            <input type="text" placeholder="Search leads..." className="input-field" style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} />
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#a0aec0', fontSize: 14 }}>Loading leads...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f8fc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Name', 'Company', 'Status', 'Source', 'Assigned To', 'Created', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: '#a0aec0' }}>No leads found</td></tr>
                ) : leads.map((lead) => (
                  <tr key={lead._id} onClick={() => router.push(`/leads/${lead._id}`)}
                    style={{ borderBottom: '1px solid #f0f4f9', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fc')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ fontWeight: 600, color: '#1a202c', fontSize: 14 }}>{lead.name}</p>
                      <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>{lead.email || lead.phone || 'No contact info'}</p>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#4a5568', fontSize: 13 }}>{lead.company || '—'}</td>
                    <td style={{ padding: '14px 16px' }}><StatusBadge status={lead.status} /></td>
                    <td style={{ padding: '14px 16px', color: '#4a5568', fontSize: 13, textTransform: 'capitalize' }}>{lead.source}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {lead.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1a73e8', flexShrink: 0 }}>
                            {lead.assignedTo.name.charAt(0)}
                          </div>
                          <span style={{ fontSize: 13, color: '#4a5568' }}>{lead.assignedTo.name}</span>
                        </div>
                      ) : <span style={{ color: '#a0aec0', fontStyle: 'italic', fontSize: 13 }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#a0aec0', fontSize: 13 }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <Link href={`/leads/${lead._id}`} style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#1a73e8', background: '#e8f0fe', border: '1px solid rgba(26,115,232,0.2)', borderRadius: 6, textDecoration: 'none' }}>
                          View
                        </Link>
                        {canAssign && (
                          <button onClick={() => { setAssignModal(lead); setAssignTo(lead.assignedTo?._id || ''); }}
                            style={{ padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#0f9d58', background: '#e6f4ea', border: '1px solid rgba(15,157,88,0.2)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <UserCheck size={12} /> Assign
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid #f0f4f9' }}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary">Previous</button>
            <span style={{ fontSize: 13, color: '#718096' }}>Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-secondary">Next</button>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, width: '100%', maxWidth: 380, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserCheck size={18} style={{ color: '#1a73e8' }} />
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a202c' }}>Assign Lead</h2>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: '#718096' }}>Assigning: <strong style={{ color: '#1a202c' }}>"{assignModal.name}"</strong></p>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 8 }}>Assign To</label>
                <select className="input-field" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                  <option value="">Unassigned</option>
                  {orgUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setAssignModal(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button onClick={handleAssign} disabled={assigning} className="btn-primary" style={{ flex: 1 }}>
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Import Modal ── */}
      {importModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #f0f4f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileSpreadsheet size={18} style={{ color: '#1a73e8' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a202c', margin: 0 }}>Import Leads</h2>
                  <p style={{ fontSize: 12, color: '#718096', margin: 0 }}>Upload Excel (.xlsx) or CSV file</p>
                </div>
              </div>
              <button onClick={() => { setImportModal(false); setImportResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: 4 }}><X size={18} /></button>
            </div>

            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Drop Zone */}
              {!importResult && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? '#1a73e8' : '#e2e8f0'}`,
                    borderRadius: 12, padding: '32px 20px', textAlign: 'center',
                    cursor: 'pointer', background: dragOver ? '#f0f7ff' : '#f7f8fc',
                    transition: 'all 0.2s',
                  }}>
                  {importing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      <p style={{ fontSize: 14, color: '#1a73e8', fontWeight: 600 }}>Importing leads...</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={28} style={{ color: dragOver ? '#1a73e8' : '#a0aec0', marginBottom: 10 }} />
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a202c', margin: '0 0 4px' }}>
                        Drag & drop your file here
                      </p>
                      <p style={{ fontSize: 12, color: '#a0aec0', margin: 0 }}>or click to browse — .xlsx, .xls, .csv supported</p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }} />
                </div>
              )}

              {/* Result */}
              {importResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1, background: '#e6f4ea', border: '1px solid rgba(15,157,88,0.2)', borderRadius: 10, padding: '14px 18px', textAlign: 'center' }}>
                      <CheckCircle size={20} style={{ color: '#0f9d58', marginBottom: 4 }} />
                      <p style={{ fontSize: 24, fontWeight: 800, color: '#0f9d58', margin: 0 }}>{importResult.success}</p>
                      <p style={{ fontSize: 12, color: '#0f9d58', fontWeight: 600, margin: 0 }}>Imported</p>
                    </div>
                    {importResult.failed > 0 && (
                      <div style={{ flex: 1, background: '#fce8e6', border: '1px solid rgba(217,48,37,0.2)', borderRadius: 10, padding: '14px 18px', textAlign: 'center' }}>
                        <AlertCircle size={20} style={{ color: '#d93025', marginBottom: 4 }} />
                        <p style={{ fontSize: 24, fontWeight: 800, color: '#d93025', margin: 0 }}>{importResult.failed}</p>
                        <p style={{ fontSize: 12, color: '#d93025', fontWeight: 600, margin: 0 }}>Failed</p>
                      </div>
                    )}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div style={{ background: '#fef7e0', border: '1px solid rgba(242,153,0,0.2)', borderRadius: 8, padding: '12px 14px' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#f29900', marginBottom: 6 }}>Issues:</p>
                      {importResult.errors.map((e, i) => <p key={i} style={{ fontSize: 12, color: '#4a5568', margin: '2px 0' }}>• {e}</p>)}
                    </div>
                  )}
                  <button onClick={() => setImportResult(null)} style={{ fontSize: 13, color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Import another file</button>
                </div>
              )}

              {/* Column Format Guide */}
              <div style={{ background: '#f7f8fc', border: '1px solid #f0f4f9', borderRadius: 10, padding: '14px 16px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', marginBottom: 8 }}>📋 Required column format:</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Name *', 'Email', 'Phone', 'Company', 'Source'].map(col => (
                    <code key={col} style={{ fontSize: 11, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 8px', color: col.includes('*') ? '#d93025' : '#1a73e8', fontFamily: 'monospace' }}>{col}</code>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 6 }}>* Name is required. All other fields are optional.</p>
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f4f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setImportModal(false); setImportResult(null); }} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
