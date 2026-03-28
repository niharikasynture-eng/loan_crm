'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  Power,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  X,
  Copy,
  ExternalLink,
} from 'lucide-react';

interface AdminInfo {
  name: string;
  email: string;
  isActive: boolean;
}

interface Organization {
  _id: string;
  name: string;
  slug: string;
  email: string;
  subscription: string;
  isActive: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'deleted';
  approvedAt?: string;
  rejectionReason?: string;
  leadFormToken?: string;
  approvedBy?: { name: string; email: string };
  adminInfo?: AdminInfo;
  createdAt: string;
}

type Tab = 'pending' | 'active' | 'all';

export default function SuperAdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [rejectModal, setRejectModal] = useState<{ orgId: string; orgName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab;

  useEffect(() => {
    if (tabParam && ['pending', 'active', 'all'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      router.replace('/dashboard');
      return;
    }
    loadOrgs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  async function loadOrgs() {
    try {
      setLoading(true);
      const data = await api.get<{ organizations: Organization[] }>('/admin/organizations');
      setOrgs(data.organizations);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function performAction(orgId: string, action: string, extra?: Record<string, unknown>) {
    setActionLoading(orgId + action);
    try {
      await api.patch('/admin/organizations', { orgId, action, ...extra });
      showToast(`Organization ${action}d successfully.`);
      await loadOrgs();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    await performAction(rejectModal.orgId, 'reject', { rejectionReason });
    setRejectModal(null);
    setRejectionReason('');
  }

  function copyFormUrl(token: string) {
    const url = `${window.location.origin}/public/${token}`;
    navigator.clipboard.writeText(url);
    showToast('Lead form URL copied!');
  }

  if (user?.role !== 'super_admin') return null;

  const filtered = orgs.filter((o) => {
    if (activeTab === 'pending') return o.status === 'pending';
    if (activeTab === 'active') return o.status === 'active' || o.status === 'approved';
    return o.status !== 'deleted';
  });

  const counts = {
    pending: orgs.filter((o) => o.status === 'pending').length,
    active: orgs.filter((o) => o.status === 'active' || o.status === 'approved').length,
    all: orgs.filter((o) => o.status !== 'deleted').length,
  };

  const TABS = [
    { id: 'pending', label: 'New Organization Requests', icon: Clock },
    { id: 'active', label: 'Active Organizations', icon: CheckCircle },
    { id: 'all', label: 'All Organizations', icon: AlertCircle },
  ] as const;

  function getStatusBadge(status: string) {
    const map: Record<string, string> = {
      pending: 'badge-new',
      approved: 'badge-qualified',
      active: 'badge-qualified',
      rejected: 'badge-lost',
      inactive: 'badge-contacted',
      deleted: 'badge-lost',
    };
    return (
      <span className={`badge ${map[status] || 'badge-new'}`}>
        {status.toUpperCase()}
      </span>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-lg text-sm animate-fade-in flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-[#334155]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-400" />
                Reject Organization
              </h2>
              <button
                onClick={() => setRejectModal(null)}
                className="p-1.5 text-[#64748b] hover:text-white rounded-lg hover:bg-[#0f172a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-[#94a3b8] text-sm">
                Rejecting <strong className="text-white">"{rejectModal.orgName}"</strong>. The
                applicant will receive a rejection email.
              </p>
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">
                  Rejection Reason (optional)
                </label>
                <textarea
                  className="input-field resize-none"
                  rows={3}
                  placeholder="e.g. Incomplete information, not eligible..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setRejectModal(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 rounded-lg font-medium text-sm transition-all"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-400" />
            Platform Organizations
          </h1>
          <p className="text-[#94a3b8] mt-1 text-sm">Manage and approve tenant applications</p>
        </div>
        <button onClick={loadOrgs} className="btn-secondary text-xs">
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1e293b] p-1 rounded-xl w-fit border border-[#334155]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {counts[tab.id as Tab] > 0 && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-[#334155]'
                }`}
              >
                {counts[tab.id as Tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="p-12 text-center text-[#64748b]">Loading organizations...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-10 h-10 text-[#334155] mx-auto mb-3" />
              <p className="text-[#64748b] text-sm">
                No{' '}
                {activeTab === 'pending'
                  ? 'pending'
                  : activeTab === 'active'
                  ? 'active'
                  : ''}{' '}
                organizations
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Admin</th>
                  <th>Status</th>
                  <th>Subscription</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <p className="font-semibold text-white">{o.name}</p>
                      <p className="text-xs text-[#64748b]">{o.slug}</p>
                      {o.rejectionReason && (
                        <p className="text-xs text-red-400 mt-0.5">
                          Reason: {o.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td>
                      {o.adminInfo ? (
                        <div>
                          <p className="text-sm text-white">{o.adminInfo.name}</p>
                          <p className="text-xs text-[#64748b]">{o.adminInfo.email}</p>
                        </div>
                      ) : (
                        <span className="text-[#64748b] text-sm italic">{o.email}</span>
                      )}
                    </td>
                    <td>{getStatusBadge(o.status)}</td>
                    <td>
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-400/10 px-2 py-1 rounded">
                        {o.subscription}
                      </span>
                    </td>
                    <td>
                      <p className="text-sm">{new Date(o.createdAt).toLocaleDateString()}</p>
                      {o.approvedAt && (
                        <p className="text-xs text-emerald-400">
                          ✓ {new Date(o.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        {o.status === 'pending' && (
                          <>
                            <button
                              onClick={() => performAction(o._id, 'approve')}
                              disabled={actionLoading === o._id + 'approve'}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 hover:bg-emerald-400/20 rounded-lg transition-all flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setRejectModal({ orgId: o._id, orgName: o.name })
                              }
                              className="px-2.5 py-1 text-xs font-medium text-red-400 bg-red-400/10 border border-red-400/30 hover:bg-red-400/20 rounded-lg transition-all flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Reject
                            </button>
                          </>
                        )}

                        {o.status === 'active' && (
                          <>
                            <button
                              onClick={() => copyFormUrl(o.leadFormToken!)}
                              title="Copy lead form URL"
                              className="px-2.5 py-1 text-xs font-medium text-sky-400 bg-sky-400/10 border border-sky-400/30 hover:bg-sky-400/20 rounded-lg transition-all flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Info
                            </button>
                            <button
                              onClick={() => performAction(o._id, 'deactivate')}
                              disabled={actionLoading === o._id + 'deactivate'}
                              className="px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/20 rounded-lg transition-all flex items-center gap-1"
                            >
                              <Power className="w-3 h-3" />
                              Deactivate
                            </button>
                          </>
                        )}

                        {o.status === 'inactive' && (
                          <button
                            onClick={() => performAction(o._id, 'activate')}
                            disabled={actionLoading === o._id + 'activate'}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 hover:bg-emerald-400/20 rounded-lg transition-all flex items-center gap-1"
                          >
                            <Power className="w-3 h-3" />
                            Activate
                          </button>
                        )}

                        {o.status !== 'deleted' && o.status !== 'pending' && (
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `Permanently delete "${o.name}"? This cannot be undone.`
                                )
                              )
                                performAction(o._id, 'delete');
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-[#64748b] bg-[#0f172a] border border-[#334155] hover:text-red-400 hover:border-red-400/30 rounded-lg transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        )}

                        {o.leadFormToken && (
                          <a
                            href={`/public/${o.leadFormToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview lead form"
                            className="px-2 py-1 text-xs font-medium text-[#64748b] hover:text-[#94a3b8] rounded-lg transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
