'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Plus, Search, UserCheck } from 'lucide-react';

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  source: string;
  createdAt: string;
  assignedTo?: { _id: string; name: string; avatar?: string };
}

interface OrgUser {
  _id: string;
  name: string;
  role: string;
}

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

  const isManager = user?.role === 'manager';
  const isOrgAdmin = user?.role === 'org_admin';
  const isSalesAgent = user?.role === 'sales_agent';
  const canAddLead = isOrgAdmin || isManager;
  const canAssign = isOrgAdmin || isManager;

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ leads: Lead[]; pages: number }>(
        `/leads?page=${page}&search=${search}`
      );
      setLeads(data.leads);
      setTotalPages(data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads, page]);

  useEffect(() => {
    if (canAssign) {
      api
        .get<{ users: OrgUser[] }>('/users?role=sales_agent')
        .then((d) => setOrgUsers(d.users))
        .catch(console.error);
    }
  }, [canAssign]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadLeads();
  }

  async function handleAssign() {
    if (!assignModal || !assignTo) return;
    setAssigning(true);
    try {
      await api.patch(`/leads/${assignModal._id}`, { assignedTo: assignTo });
      setAssignModal(null);
      setAssignTo('');
      loadLeads();
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  }

  function getStatusBadge(status: string) {
    return (
      <span className={`badge badge-${status.replace('_', '-')}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isSalesAgent ? 'My Leads' : 'Leads'}
          </h1>
          <p className="text-[#94a3b8] mt-1 text-sm">
            {isSalesAgent
              ? 'Leads assigned to you'
              : 'Manage and track your organization\'s leads'}
          </p>
        </div>
        {canAddLead && (
          <Link href="/leads/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Lead
          </Link>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
          <form onSubmit={handleSearch} className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search leads..."
              className="input-field pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="p-8 text-center text-[#64748b]">Loading leads...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Assigned To</th>
                  <th>Created</th>
                  {canAssign && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr>
                    <td colSpan={canAssign ? 7 : 6} className="text-center py-8 text-[#64748b]">
                      No leads found
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr 
                      key={lead._id}
                      onClick={() => router.push(`/leads/${lead._id}`)}
                      className="cursor-pointer hover:bg-white/5 transition-colors group"
                    >
                      <td>
                        <p className="font-semibold text-white group-hover:text-indigo-400 trasition-colors">
                          {lead.name}
                        </p>
                        <p className="text-xs text-[#64748b] mt-0.5">
                          {lead.email || lead.phone || 'No contact info'}
                        </p>
                      </td>
                      <td>{lead.company || '-'}</td>
                      <td>{getStatusBadge(lead.status)}</td>
                      <td>{lead.source}</td>
                      <td>
                        {lead.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#334155] flex items-center justify-center text-[10px] font-bold">
                              {lead.assignedTo.name.charAt(0)}
                            </div>
                            <span className="text-sm">{lead.assignedTo.name}</span>
                          </div>
                        ) : (
                          <span className="text-[#64748b] italic">Unassigned</span>
                        )}
                      </td>
                      <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link 
                            href={`/leads/${lead._id}`}
                            className="px-2.5 py-1 text-xs font-medium text-[#cbd5e1] bg-[#1e293b] border border-[#334155] hover:text-white hover:border-[#475569] rounded-lg transition-all"
                          >
                            View
                          </Link>
                          {canAssign && (
                            <button
                              onClick={() => {
                                setAssignModal(lead);
                                setAssignTo(lead.assignedTo?._id || '');
                              }}
                              className="px-2.5 py-1 text-xs font-medium text-indigo-400 bg-indigo-400/10 border border-indigo-400/30 hover:bg-indigo-400/20 rounded-lg transition-all flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3" />
                              Assign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary"
            >
              Previous
            </button>
            <span className="text-sm text-[#94a3b8]">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-sm shadow-2xl">
            <div className="p-6 border-b border-[#334155]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                Assign Lead
              </h2>
              <p className="text-sm text-[#94a3b8] mt-1">"{assignModal.name}"</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">
                  Assign To
                </label>
                <select
                  className="input-field"
                  value={assignTo}
                  onChange={(e) => setAssignTo(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {orgUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setAssignModal(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={assigning}
                  className="btn-primary flex-1"
                >
                  {assigning ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
