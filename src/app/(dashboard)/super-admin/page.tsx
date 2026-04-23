'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2, Power, Trash2, CheckCircle, XCircle,
  Clock, AlertCircle, X, Copy, ExternalLink, RefreshCw,
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

  function copyFormUrl(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/public/${token}`);
    showToast('Lead form URL copied!');
  }

  if (user?.role !== 'super_admin') return null;

  const filtered = orgs.filter((o) => {
    if (activeTab === 'pending') return o.status === 'pending';
    if (activeTab === 'active') return o.status === 'active' || o.status === 'approved';
    // "All" tab = every organization (including inactive/rejected, excluding deleted)
    return o.status !== 'deleted';
  });

  const counts = {
    pending: orgs.filter((o) => o.status === 'pending').length,
    active: orgs.filter((o) => o.status === 'active' || o.status === 'approved').length,
    all: orgs.filter((o) => o.status !== 'deleted').length,
  };

  // Color palette for the new light-navy theme
  const NAVY = '#1e2d4d';
  const NAVY_LIGHT = '#2d3f64';

  function StatusBadge({ status }: { status: string }) {
    const MAP: Record<string, { bg: string; color: string; label: string }> = {
      pending:  { bg: '#fef7e0', color: '#f29900', label: 'Pending'  },
      approved: { bg: '#e6f4ea', color: '#0f9d58', label: 'Active'   },  // treat approved = active
      active:   { bg: '#e6f4ea', color: '#0f9d58', label: 'Active'   },
      rejected: { bg: '#fce8e6', color: '#d93025', label: 'Rejected' },
      inactive: { bg: '#f0f4f9', color: '#718096', label: 'Inactive' },
      deleted:  { bg: '#fce8e6', color: '#d93025', label: 'Deleted'  },
    };
    const s = MAP[status] || MAP['pending'];
    return (
      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {s.label}
      </span>
    );
  }

  // Stat card component
  function StatCard({ label, value, icon: Icon, color, borderColor }: { label: string; value: number; icon: any; color: string; borderColor: string }) {
    return (
      <div style={{ background: '#fff', border: `1px solid #e2e8f0`, borderRadius: 12, padding: '20px 24px', borderLeft: `4px solid ${borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: '#1a202c', lineHeight: 1 }}>{loading ? '—' : value}</p>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div className="animate-fade-in" style={{ position: 'fixed', top: 24, right: 24, zIndex: 50, background: '#e6f4ea', border: '1px solid #0f9d58', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={16} style={{ color: '#0f9d58' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#0f9d58' }}>{toast}</span>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 25px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a202c', display: 'flex', alignItems: 'center', gap: 8 }}>
                <XCircle size={18} style={{ color: '#d93025' }} /> Reject Organization
              </h2>
              <button onClick={() => setRejectModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: 4 }}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 14, color: '#718096', lineHeight: 1.6 }}>
                Rejecting <strong style={{ color: '#1a202c' }}>"{rejectModal.orgName}"</strong>. The applicant will receive a rejection email.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 8 }}>Rejection Reason (optional)</label>
                <textarea className="input-field" style={{ resize: 'none', minHeight: 80 }} rows={3} placeholder="e.g. Incomplete information..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setRejectModal(null)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button onClick={handleReject} className="btn-danger" style={{ flex: 1 }}>Confirm Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Heading */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1a73e8, #4285f4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(26,115,232,0.3)' }}>
            <Building2 size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1a202c', letterSpacing: '-0.3px' }}>Platform Organizations</h1>
            <p style={{ fontSize: 13, color: '#718096', marginTop: 2 }}>Manage and approve tenant applications</p>
          </div>
        </div>
        <button onClick={loadOrgs} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        <StatCard label="Pending" value={counts.pending} icon={Clock} color="#f29900" borderColor="#f29900" />
        <StatCard label="Active" value={counts.active} icon={CheckCircle} color="#0f9d58" borderColor="#0f9d58" />
        <StatCard label="Total" value={counts.all} icon={Building2} color="#1a73e8" borderColor="#1a73e8" />
      </div>

      {/* Filter Tabs — simple pill style */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([
          { id: 'pending', label: 'Pending Approval', count: counts.pending },
          { id: 'active',  label: 'Active',           count: counts.active },
          { id: 'all',     label: 'All Decisions',    count: counts.all },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '6px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              background: activeTab === tab.id ? '#1a73e8' : '#fff',
              color: activeTab === tab.id ? '#fff' : '#718096',
              boxShadow: activeTab === tab.id ? '0 2px 8px rgba(26,115,232,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            <span style={{
              background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : '#f0f4f9',
              color: activeTab === tab.id ? '#fff' : '#a0aec0',
              fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 100,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #e2e8f0', borderTopColor: '#1a73e8', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.7s linear infinite' }} />
            <p style={{ color: '#a0aec0', fontSize: 14 }}>Loading organizations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: '#f0f4f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Building2 size={28} style={{ color: '#a0aec0' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#4a5568' }}>
              {activeTab === 'pending' ? 'No pending approvals' : activeTab === 'active' ? 'No active organizations' : 'No approved or rejected organizations'}
            </p>
            <p style={{ fontSize: 13, color: '#a0aec0', marginTop: 6 }}>
              {activeTab === 'pending' ? 'New registrations will appear here for review' : activeTab === 'active' ? 'Approved organizations will appear here' : 'Approved and rejected organizations will appear here'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f8fc', borderBottom: '1px solid #e2e8f0' }}>
                {['Organization', 'Admin', 'Status', 'Subscription', 'Registered', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o._id} style={{ borderBottom: '1px solid #f0f4f9', transition: 'background 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fc')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <td style={{ padding: '16px 20px' }}>
                    <p style={{ fontWeight: 700, color: '#1a202c', fontSize: 14 }}>{o.name}</p>
                    <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>{o.slug}</p>
                    {o.rejectionReason && <p style={{ fontSize: 12, color: '#d93025', marginTop: 4 }}>Reason: {o.rejectionReason}</p>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {o.adminInfo ? (
                      <div>
                        <p style={{ fontSize: 14, color: '#1a202c', fontWeight: 500 }}>{o.adminInfo.name}</p>
                        <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>{o.adminInfo.email}</p>
                      </div>
                    ) : (
                      <span style={{ color: '#a0aec0', fontSize: 13, fontStyle: 'italic' }}>{o.email}</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#1a73e8', background: '#e8f0fe', padding: '4px 10px', borderRadius: 6 }}>
                      {o.subscription}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <p style={{ fontSize: 13, color: '#4a5568' }}>{new Date(o.createdAt).toLocaleDateString()}</p>
                    {o.approvedAt && <p style={{ fontSize: 11, color: '#0f9d58', marginTop: 2 }}>✓ {new Date(o.approvedAt).toLocaleDateString()}</p>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {o.status === 'pending' && (
                        <>
                          <button onClick={() => performAction(o._id, 'approve')} disabled={actionLoading === o._id + 'approve'}
                            style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#0f9d58', background: '#e6f4ea', border: '1px solid rgba(15,157,88,0.25)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}>
                            <CheckCircle size={12} /> Approve
                          </button>
                          <button onClick={() => setRejectModal({ orgId: o._id, orgName: o.name })}
                            style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#d93025', background: '#fce8e6', border: '1px solid rgba(217,48,37,0.25)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s' }}>
                            <XCircle size={12} /> Reject
                          </button>
                        </>
                      )}
                      {/* Active / Approved orgs: Deactivate + Copy URL */}
                      {(o.status === 'active' || o.status === 'approved') && (
                        <>
                          {o.leadFormToken && (
                            <button onClick={() => copyFormUrl(o.leadFormToken!)}
                              style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#1a73e8', background: '#e8f0fe', border: '1px solid rgba(26,115,232,0.25)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Copy size={12} /> Copy URL
                            </button>
                          )}
                          <button onClick={() => performAction(o._id, 'deactivate')} disabled={actionLoading === o._id + 'deactivate'}
                            style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#f29900', background: '#fef7e0', border: '1px solid rgba(242,153,0,0.25)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Power size={12} /> {actionLoading === o._id + 'deactivate' ? 'Wait...' : 'Deactivate'}
                          </button>
                        </>
                      )}
                      {/* Inactive orgs: Activate */}
                      {o.status === 'inactive' && (
                        <button onClick={() => performAction(o._id, 'activate')} disabled={actionLoading === o._id + 'activate'}
                          style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#0f9d58', background: '#e6f4ea', border: '1px solid rgba(15,157,88,0.25)', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Power size={12} /> {actionLoading === o._id + 'activate' ? 'Wait...' : 'Activate'}
                        </button>
                      )}
                      {o.status !== 'deleted' && o.status !== 'pending' && (
                        <button onClick={() => { if (confirm(`Permanently delete "${o.name}"? This cannot be undone.`)) performAction(o._id, 'delete'); }}
                          style={{ padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#a0aec0', background: '#f0f4f9', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                      {o.leadFormToken && (
                        <a href={`/public/${o.leadFormToken}`} target="_blank" rel="noopener noreferrer"
                          style={{ padding: '5px 8px', color: '#a0aec0', borderRadius: 6, display: 'flex', alignItems: 'center', textDecoration: 'none', transition: 'color 0.12s' }}>
                          <ExternalLink size={13} />
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
