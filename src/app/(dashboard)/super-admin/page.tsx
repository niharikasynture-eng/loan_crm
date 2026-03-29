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
    <div style={{ padding: '32px 40px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-fade-in" style={{ padding: '14px 20px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-300 text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ padding: '24px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card w-full max-w-md" style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <XCircle className="w-5 h-5 text-red-400" />
                Reject Organization
              </h2>
              <button
                onClick={() => setRejectModal(null)}
                style={{ padding: '8px', color: '#64748b', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
                Rejecting <strong style={{ color: '#fff' }}>"{rejectModal.orgName}"</strong>. The
                applicant will receive a rejection email.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '10px' }}>
                  Rejection Reason (optional)
                </label>
                <textarea
                  className="input-field"
                  style={{ resize: 'none', minHeight: '80px' }}
                  rows={3}
                  placeholder="e.g. Incomplete information, not eligible..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button onClick={() => setRejectModal(null)} className="btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  style={{ flex: 1, padding: '10px 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '12px', fontWeight: '600', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -4px rgba(99, 102, 241, 0.4)' }}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                Platform Organizations
              </h1>
            </div>
          </div>
          <p style={{ color: '#64748b', fontSize: '15px', marginLeft: '58px' }}>
            Manage and approve tenant applications
          </p>
        </div>
        <button onClick={loadOrgs} className="btn-secondary" style={{ marginTop: '8px' }}>
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '24px 28px', borderLeft: '3px solid #f59e0b' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Pending</p>
              <p style={{ fontSize: '32px', fontWeight: '800', color: '#fff' }}>{counts.pending}</p>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '24px 28px', borderLeft: '3px solid #10b981' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Active</p>
              <p style={{ fontSize: '32px', fontWeight: '800', color: '#fff' }}>{counts.active}</p>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
        <div className="card" style={{ padding: '24px 28px', borderLeft: '3px solid #6366f1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total</p>
              <p style={{ fontSize: '32px', fontWeight: '800', color: '#fff' }}>{counts.all}</p>
            </div>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: '#1e293b', padding: '5px', borderRadius: '14px', width: 'fit-content', border: '1px solid #334155', marginBottom: '28px' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === tab.id ? '#6366f1' : 'transparent',
              color: activeTab === tab.id ? '#fff' : '#64748b',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none',
            }}
          >
            <tab.icon style={{ width: '15px', height: '15px' }} />
            {tab.label}
            {counts[tab.id as Tab] > 0 && (
              <span style={{
                fontSize: '12px',
                padding: '1px 8px',
                borderRadius: '100px',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : '#334155',
                fontWeight: '700',
              }}>
                {counts[tab.id as Tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: '#64748b', fontSize: '14px' }}>Loading organizations...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '80px 0', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(51, 65, 85, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Building2 className="w-7 h-7" style={{ color: '#475569' }} />
              </div>
              <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>
                No{' '}
                {activeTab === 'pending'
                  ? 'pending'
                  : activeTab === 'active'
                  ? 'active'
                  : ''}{' '}
                organizations
              </p>
              <p style={{ color: '#475569', fontSize: '13px', marginTop: '6px' }}>
                Organizations will appear here when they register
              </p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ padding: '16px 24px' }}>Organization</th>
                  <th style={{ padding: '16px 24px' }}>Admin</th>
                  <th style={{ padding: '16px 24px' }}>Status</th>
                  <th style={{ padding: '16px 24px' }}>Subscription</th>
                  <th style={{ padding: '16px 24px' }}>Registered</th>
                  <th style={{ padding: '16px 24px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o._id}>
                    <td style={{ padding: '18px 24px' }}>
                      <p style={{ fontWeight: '600', color: '#fff', fontSize: '14px' }}>{o.name}</p>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{o.slug}</p>
                      {o.rejectionReason && (
                        <p style={{ fontSize: '12px', color: '#f87171', marginTop: '4px' }}>
                          Reason: {o.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      {o.adminInfo ? (
                        <div>
                          <p style={{ fontSize: '14px', color: '#f1f5f9' }}>{o.adminInfo.name}</p>
                          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{o.adminInfo.email}</p>
                        </div>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic' }}>{o.email}</span>
                      )}
                    </td>
                    <td style={{ padding: '18px 24px' }}>{getStatusBadge(o.status)}</td>
                    <td style={{ padding: '18px 24px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a5b4fc', background: 'rgba(99, 102, 241, 0.1)', padding: '5px 12px', borderRadius: '6px' }}>
                        {o.subscription}
                      </span>
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <p style={{ fontSize: '14px', color: '#cbd5e1' }}>{new Date(o.createdAt).toLocaleDateString()}</p>
                      {o.approvedAt && (
                        <p style={{ fontSize: '12px', color: '#34d399', marginTop: '3px' }}>
                          ✓ {new Date(o.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '18px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {o.status === 'pending' && (
                          <>
                            <button
                              onClick={() => performAction(o._id, 'approve')}
                              disabled={actionLoading === o._id + 'approve'}
                              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setRejectModal({ orgId: o._id, orgName: o.name })
                              }
                              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}

                        {o.status === 'active' && (
                          <>
                            <button
                              onClick={() => copyFormUrl(o.leadFormToken!)}
                              title="Copy lead form URL"
                              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: '#38bdf8', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.25)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Copy URL
                            </button>
                            <button
                              onClick={() => performAction(o._id, 'deactivate')}
                              disabled={actionLoading === o._id + 'deactivate'}
                              style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                              <Power className="w-3.5 h-3.5" />
                              Deactivate
                            </button>
                          </>
                        )}

                        {o.status === 'inactive' && (
                          <button
                            onClick={() => performAction(o._id, 'activate')}
                            disabled={actionLoading === o._id + 'activate'}
                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: '#34d399', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}
                          >
                            <Power className="w-3.5 h-3.5" />
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
                            style={{ padding: '6px 14px', fontSize: '12px', fontWeight: '600', color: '#64748b', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px' }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}

                        {o.leadFormToken && (
                          <a
                            href={`/public/${o.leadFormToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Preview lead form"
                            style={{ padding: '6px 10px', fontSize: '12px', fontWeight: '600', color: '#64748b', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
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
