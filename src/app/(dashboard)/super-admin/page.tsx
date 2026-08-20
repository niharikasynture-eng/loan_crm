'use client';

import * as React from 'react';
import { useEffect, useState, Suspense } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2, Power, Trash2, CheckCircle, XCircle,
  Clock, AlertCircle, X, Copy, ExternalLink, RefreshCw, Plus, ShieldCheck, Mail, Lock, User, Sparkles
} from 'lucide-react';

interface AdminInfo { name: string; email: string; isActive: boolean; }
interface Organization {
  _id: string; name: string; slug: string; email: string;
  subscription: string; isActive: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'deleted';
  approvedAt?: string; rejectionReason?: string; leadFormToken?: string;
  approvedBy?: { name: string; email: string }; adminInfo?: AdminInfo; createdAt: string;
}
type Tab = 'pending' | 'active' | 'all';

function SuperAdminContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('pending');
  const [rejectModal, setRejectModal] = useState<{ orgId: string; orgName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  // Create Organization Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    adminName: '',
    adminEmail: '',
    password: '',
    subscription: 'pro'
  });

  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab;

  useEffect(() => {
    if (tabParam && ['pending', 'active', 'all'].includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  useEffect(() => {
    if (user && user.role !== 'super_admin') { router.replace('/dashboard'); return; }
    loadOrgs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  async function loadOrgs() {
    try {
      setLoading(true);
      const data = await api.get<{ organizations: Organization[] }>('/admin/organizations');
      setOrgs(data.organizations);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function performAction(orgId: string, action: string, extra?: Record<string, unknown>) {
    setActionLoading(orgId + action);
    try {
      await api.patch('/admin/organizations', { orgId, action, ...extra });
      showToast(`Organization ${action}d successfully.`);
      await loadOrgs();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Action failed'); }
    finally { setActionLoading(null); }
  }

  async function handleReject() {
    if (!rejectModal) return;
    await performAction(rejectModal.orgId, 'reject', { rejectionReason });
    setRejectModal(null); setRejectionReason('');
  }

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.name || !createForm.adminName || !createForm.adminEmail || !createForm.password) {
      alert('Please fill in all required fields');
      return;
    }
    setIsCreatingOrg(true);
    try {
      await api.post('/admin/organizations', createForm);
      showToast(`Organization "${createForm.name}" created successfully!`);
      setIsCreateModalOpen(false);
      setCreateForm({ name: '', adminName: '', adminEmail: '', password: '', subscription: 'pro' });
      await loadOrgs();
    } catch (err: any) {
      alert(err.message || 'Failed to create organization');
    } finally {
      setIsCreatingOrg(false);
    }
  }

  function copyFormUrl(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/public/${token}`);
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

  function StatusBadge({ status }: { status: string }) {
    const MAP: Record<string, { bg: string; color: string; border: string; label: string }> = {
      pending:  { bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200', label: 'Pending Approval'  },
      approved: { bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200', label: 'Active Tenant' },
      active:   { bg: 'bg-emerald-50', color: 'text-emerald-700', border: 'border-emerald-200', label: 'Active Tenant' },
      rejected: { bg: 'bg-rose-50', color: 'text-rose-700', border: 'border-rose-200', label: 'Rejected' },
      inactive: { bg: 'bg-slate-100', color: 'text-slate-600', border: 'border-slate-200', label: 'Inactive' },
      deleted:  { bg: 'bg-rose-50', color: 'text-rose-700', border: 'border-rose-200', label: 'Deleted'  },
    };
    const s = MAP[status] || MAP['pending'];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border ${s.bg} ${s.color} ${s.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.color.replace('text', 'bg')}`} />
        {s.label}
      </span>
    );
  }

  function SubscriptionBadge({ sub }: { sub: string }) {
    const s = sub.toLowerCase();
    let cls = 'bg-slate-100 text-slate-700 border-slate-200';
    if (s === 'enterprise') cls = 'bg-purple-100/80 text-purple-700 border-purple-200 font-extrabold shadow-2xs';
    else if (s === 'pro') cls = 'bg-indigo-100/80 text-indigo-700 border-indigo-200 font-extrabold';
    else if (s === 'starter') cls = 'bg-emerald-100/80 text-emerald-700 border-emerald-200 font-bold';

    return (
      <span className={`inline-block px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border ${cls}`}>
        {sub}
      </span>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white shadow-xl rounded-xl px-5 py-3.5 flex items-center gap-3 animate-slide-in">
          <CheckCircle size={18} />
          <span className="text-sm font-bold">{toast}</span>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-rose-50/50">
              <h2 className="text-sm font-bold text-rose-900 flex items-center gap-2">
                <XCircle size={18} className="text-rose-600" /> Reject Organization
              </h2>
              <button onClick={() => setRejectModal(null)} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Rejecting <strong className="text-slate-900">"{rejectModal.orgName}"</strong>. The applicant will receive a rejection notification.
              </p>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Rejection Reason</label>
                <textarea
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  rows={3}
                  placeholder="e.g. Incomplete verification details..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setRejectModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleReject} className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm">Confirm Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Organization Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-indigo-50/60">
              <h2 className="text-sm font-extrabold text-indigo-950 flex items-center gap-2">
                <Building2 size={18} className="text-indigo-600" /> Create New Organization
              </h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateOrg} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Enterprises"
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Apex"
                    value={createForm.adminName}
                    onChange={e => setCreateForm({ ...createForm, adminName: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subscription Plan</label>
                  <select
                    value={createForm.subscription}
                    onChange={e => setCreateForm({ ...createForm, subscription: e.target.value })}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@apex.com"
                  value={createForm.adminEmail}
                  onChange={e => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Admin Initial Password *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter initial password (e.g. password123)"
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-mono font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 focus:bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={isCreatingOrg} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md">
                  {isCreatingOrg ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Light Blue Hero Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-sky-100 via-indigo-100/90 to-blue-100 rounded-3xl p-7 md:p-8 text-indigo-950 border border-indigo-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xs">
            <Sparkles size={12} /> Platform Operations Control
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-indigo-950">
            Organization Management
          </h1>
          <p className="text-xs md:text-sm text-indigo-800/90 max-w-xl font-semibold leading-relaxed">
            Monitor tenant health, approve pending registrations, and provision new enterprise organizations.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="h-11 px-5 bg-white hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black shadow-md shadow-indigo-600/10 flex items-center gap-2 transition-all active:scale-95 border border-indigo-200/80"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create Organization</span>
          </button>

          <button
            onClick={loadOrgs}
            className="h-11 px-4 bg-white hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black shadow-md shadow-indigo-600/10 flex items-center gap-2 transition-all active:scale-95 border border-indigo-200/80"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Colorful Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Pending Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-50 to-amber-100/30 border border-amber-200/80 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-700">Pending Approvals</p>
            <p className="text-3xl font-black text-amber-950">{loading ? '—' : counts.pending}</p>
            <p className="text-[11px] font-semibold text-amber-600">Requires review</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
            <Clock size={22} />
          </div>
        </div>

        {/* Active Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50/50 border border-emerald-200/80 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-emerald-700">Active Organizations</p>
            <p className="text-3xl font-black text-emerald-950">{loading ? '—' : counts.active}</p>
            <p className="text-[11px] font-semibold text-emerald-600">Fully operational</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <CheckCircle size={22} />
          </div>
        </div>

        {/* Total Orgs Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-50 to-sky-50/50 border border-indigo-200/80 shadow-xs flex items-center justify-between transition-all hover:shadow-md">
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-700">Total Provisioned</p>
            <p className="text-3xl font-black text-indigo-950">{loading ? '—' : counts.all}</p>
            <p className="text-[11px] font-semibold text-indigo-600">Platform tenants</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
            <Building2 size={22} />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200/80">
        {([
          { id: 'pending', label: 'Pending Approval', count: counts.pending, color: 'bg-amber-500 text-white' },
          { id: 'active',  label: 'Active Tenants',   count: counts.active,  color: 'bg-emerald-600 text-white' },
          { id: 'all',     label: 'All Organizations', count: counts.all,     color: 'bg-indigo-600 text-white' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? `${tab.color} shadow-sm`
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
              activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Colorful Table Box Container */}
      <div className="bg-white rounded-3xl border border-indigo-100/80 shadow-md overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-9 h-9 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Organizations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-500">
              <Building2 size={32} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900">
                {activeTab === 'pending' ? 'No Pending Approvals' : activeTab === 'active' ? 'No Active Organizations' : 'No Organizations Found'}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {activeTab === 'pending' ? 'New registration requests will appear here.' : 'Create or approve organizations to populate this view.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-indigo-50/70 border-b border-indigo-100 text-indigo-950 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-4 px-6">Organization</th>
                  <th className="py-4 px-6">Admin Contact</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Subscription</th>
                  <th className="py-4 px-6">Created Date</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white font-medium">
                {filtered.map((o) => (
                  <tr key={o._id} className="hover:bg-indigo-50/40 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white font-black flex items-center justify-center shadow-sm text-sm shrink-0">
                          {o.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-indigo-950 text-sm group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                            {o.name}
                          </p>
                          <p className="text-[11px] font-mono font-medium text-slate-400 mt-0.5">{o.slug}</p>
                          {o.rejectionReason && <p className="text-[11px] text-rose-600 font-semibold mt-1">Reason: {o.rejectionReason}</p>}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      {o.adminInfo ? (
                        <div>
                          <p className="font-bold text-slate-800">{o.adminInfo.name}</p>
                          <p className="text-[11px] font-mono text-indigo-600 mt-0.5 font-semibold">{o.adminInfo.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono italic">{o.email}</span>
                      )}
                    </td>

                    <td className="py-4 px-6">
                      <StatusBadge status={o.status} />
                    </td>

                    <td className="py-4 px-6">
                      <SubscriptionBadge sub={o.subscription} />
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-700">{new Date(o.createdAt).toLocaleDateString()}</p>
                      {o.approvedAt && <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">✓ Approved {new Date(o.approvedAt).toLocaleDateString()}</p>}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {o.status === 'pending' && (
                          <>
                            <button
                              onClick={() => performAction(o._id, 'approve')}
                              disabled={actionLoading === o._id + 'approve'}
                              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                              <CheckCircle size={13} /> Approve
                            </button>
                            <button
                              onClick={() => setRejectModal({ orgId: o._id, orgName: o.name })}
                              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}

                        {(o.status === 'active' || o.status === 'approved') && (
                          <>
                            {o.leadFormToken && (
                              <button
                                onClick={() => copyFormUrl(o.leadFormToken!)}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                              >
                                <Copy size={13} /> Copy Form URL
                              </button>
                            )}
                            <button
                              onClick={() => performAction(o._id, 'deactivate')}
                              disabled={actionLoading === o._id + 'deactivate'}
                              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                            >
                              <Power size={13} /> Deactivate
                            </button>
                          </>
                        )}

                        {o.status === 'inactive' && (
                          <button
                            onClick={() => performAction(o._id, 'activate')}
                            disabled={actionLoading === o._id + 'activate'}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Power size={13} /> Activate
                          </button>
                        )}

                        {o.status !== 'deleted' && o.status !== 'pending' && (
                          <button
                            onClick={() => { if (confirm(`Permanently delete "${o.name}"? This cannot be undone.`)) performAction(o._id, 'delete'); }}
                            className="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}

                        {o.leadFormToken && (
                          <a
                            href={`/public/${o.leadFormToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Open Public Lead Form"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin border-indigo-600" />
        </div>
      }
    >
      <SuperAdminContent />
    </React.Suspense>
  );
}
