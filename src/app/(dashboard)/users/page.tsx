'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Shield, ShieldAlert, ShieldCheck, User as UserIcon, Plus, X, Loader2 } from 'lucide-react';

interface User {
  _id: string; name: string; email: string; role: string;
  phone?: string; isActive: boolean; createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers]     = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [modalMode, setModalMode]       = useState<'invite' | 'edit'>('invite');
  const [editingUser, setEditingUser]   = useState<User | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'sales_agent', phone: '' });

  useEffect(() => {
    if (currentUser && currentUser.role !== 'org_admin' && currentUser.role !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api.get<{ users: User[] }>('/users');
      setUsers(data.users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  function openInvite() {
    setModalMode('invite'); setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: 'sales_agent', phone: '' });
    setIsModalOpen(true);
  }

  function openEdit(user: User) {
    setModalMode('edit'); setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, phone: user.phone || '' });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true);
    try {
      if (modalMode === 'invite') {
        await api.post('/users', form);
      } else if (editingUser) {
        await api.patch(`/users/${editingUser._id}`, {
          name: form.name, role: form.role, phone: form.phone,
          ...(form.password && { password: form.password }),
        });
      }
      setIsModalOpen(false); loadUsers();
    } catch (err: any) { alert(err.message || 'Operation failed'); }
    finally { setSubmitting(false); }
  }

  const ROLE_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    super_admin: { label: 'Super Admin',  color: '#7c3aed', bg: '#f3f0ff', icon: <ShieldAlert size={14} style={{ color: '#7c3aed' }} /> },
    org_admin:   { label: 'Org Admin',    color: '#1a73e8', bg: '#e8f0fe', icon: <ShieldCheck size={14} style={{ color: '#1a73e8' }} /> },
    manager:     { label: 'Manager',      color: '#0f9d58', bg: '#e6f4ea', icon: <Shield size={14} style={{ color: '#0f9d58' }} /> },
    sales_agent: { label: 'Sales Agent',  color: '#f29900', bg: '#fef7e0', icon: <UserIcon size={14} style={{ color: '#f29900' }} /> },
  };

  return (
    <div style={{ maxWidth: 1280 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a202c' }}>Team Management</h1>
          <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>Manage user access and roles</p>
        </div>
        {(currentUser?.role === 'org_admin' || currentUser?.role === 'super_admin') && (
          <button onClick={openInvite} className="btn-primary"><Plus size={15} /> Invite User</button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#a0aec0', fontSize: 14 }}>Loading team...</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f8fc', borderBottom: '1px solid #e2e8f0' }}>
                {['User', 'Role', 'Phone', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: '#a0aec0' }}>No users found</td></tr>
              ) : users.map((u) => {
                const role = ROLE_META[u.role] || ROLE_META['sales_agent'];
                return (
                  <tr key={u._id} style={{ borderBottom: '1px solid #f0f4f9', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f7f8fc')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: role.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: role.color, flexShrink: 0 }}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: '#1a202c', fontSize: 14 }}>
                            {u.name}
                            {currentUser?.id === u._id && <span style={{ fontSize: 11, background: '#f0f4f9', color: '#718096', padding: '1px 8px', borderRadius: 100, marginLeft: 8 }}>You</span>}
                          </p>
                          <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 1 }}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: role.bg, padding: '4px 10px', borderRadius: 100 }}>
                        {role.icon}
                        <span style={{ fontSize: 12, fontWeight: 600, color: role.color }}>{role.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#718096', fontSize: 13 }}>{u.phone || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: u.isActive ? '#e6f4ea' : '#fce8e6', color: u.isActive ? '#0f9d58' : '#d93025', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#a0aec0', fontSize: 13 }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => openEdit(u)} style={{ fontSize: 13, fontWeight: 600, color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a202c' }}>
                {modalMode === 'invite' ? 'Invite Team Member' : 'Edit User Profile'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: 4 }}><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Full Name', name: 'name', type: 'text', placeholder: 'John Doe', required: true },
                { label: 'Email Address', name: 'email', type: 'email', placeholder: 'john@example.com', required: true, disabled: modalMode === 'edit' },
                { label: modalMode === 'invite' ? 'Temporary Password' : 'New Password (Optional)', name: 'password', type: 'password', placeholder: '••••••••', required: modalMode === 'invite' },
                { label: 'Phone Number', name: 'phone', type: 'text', placeholder: '+1234567890', required: false },
              ].map(({ label, name, type, placeholder, required, disabled }) => (
                <div key={name}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>{label}</label>
                  <input
                    type={type} className="input-field" placeholder={placeholder}
                    value={form[name as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                    required={required} disabled={disabled}
                  />
                  {name === 'password' && modalMode === 'edit' && <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>Leave blank to keep current password</p>}
                </div>
              ))}

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Role</label>
                <select className="input-field" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="sales_agent">Sales Agent</option>
                  <option value="manager">Manager</option>
                  <option value="org_admin">Organization Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 1 }}>
                  {submitting && <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />}
                  {modalMode === 'invite' ? 'Send Invite' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
