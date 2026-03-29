'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Shield, ShieldAlert, ShieldCheck, User as UserIcon, Plus, X, Loader2, AlertCircle } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Role Guard
  useEffect(() => {
    if (currentUser && currentUser.role !== 'org_admin' && currentUser.role !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'invite' | 'edit'>('invite');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales_agent',
    phone: '',
  });

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api.get<{ users: User[] }>('/users');
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openInvite() {
    setModalMode('invite');
    setEditingUser(null);
    setForm({ name: '', email: '', password: '', role: 'sales_agent', phone: '' });
    setIsModalOpen(true);
  }

  function openEdit(user: User) {
    setModalMode('edit');
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, phone: user.phone || '' });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (modalMode === 'invite') {
        await api.post('/users', form);
      } else if (editingUser) {
        await api.patch(`/users/${editingUser._id}`, {
          name: form.name,
          role: form.role,
          phone: form.phone,
          ...(form.password && { password: form.password })
        });
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function getRoleIcon(role: string) {
    switch (role) {
      case 'super_admin': return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'org_admin': return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case 'manager': return <Shield className="w-4 h-4 text-emerald-400" />;
      default: return <UserIcon className="w-4 h-4 text-indigo-400" />;
    }
  }

  function getRoleLabel(role: string) {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'org_admin': return 'Admin';
      case 'manager': return 'Manager';
      default: return 'Sales Agent';
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Management</h1>
          <p className="text-[#94a3b8] mt-1 text-sm">Manage user access and roles</p>
        </div>
        {(currentUser?.role === 'org_admin' || currentUser?.role === 'super_admin') && (
          <button onClick={openInvite} className="btn-primary">
            <Plus className="w-4 h-4" />
            Invite User
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div className="p-8 text-center text-[#64748b]">Loading team...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-[#64748b]">No users found</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0f172a] border border-[#334155] flex items-center justify-center font-bold text-[#e2e8f0]">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{u.name} {currentUser?.id === u._id && <span className="text-xs bg-[#0f172a] text-[#94a3b8] px-2 py-0.5 rounded-full ml-2">You</span>}</p>
                            <p className="text-xs text-[#64748b]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0f172a] border border-[#334155] w-max">
                          {getRoleIcon(u.role)}
                          <span className="text-sm font-medium text-[#cbd5e1]">{getRoleLabel(u.role)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-[#94a3b8]">{u.phone || '-'}</span>
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-qualified' : 'badge-lost'}`}>
                          {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td>
                        <button 
                          onClick={() => openEdit(u)}
                          className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="card w-full max-w-md shadow-2xl border-indigo-500/20 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-[#334155]">
              <h2 className="text-xl font-bold text-white">
                {modalMode === 'invite' ? 'Invite Team Member' : 'Edit User Profile'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-[#64748b] hover:text-white rounded-lg hover:bg-[#0f172a] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Full Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Email Address</label>
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                  disabled={modalMode === 'edit'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">
                  {modalMode === 'invite' ? 'Temporary Password' : 'New Password (Optional)'}
                </label>
                <input
                  type="password"
                  className="input-field"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required={modalMode === 'invite'}
                />
                {modalMode === 'edit' && <p className="text-[10px] text-[#64748b] mt-1">Leave blank to keep current password</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Role</label>
                <select
                  className="input-field"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="sales_agent">Sales Agent</option>
                  <option value="manager">Manager</option>
                  <option value="org_admin">Organization Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Phone Number</label>
                <input
                  type="text"
                  className="input-field"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary flex-1"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {modalMode === 'invite' ? 'Send Invite' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

  );
}
