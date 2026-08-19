'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { Shield, ShieldAlert, ShieldCheck, User as UserIcon, Plus, X, Loader2, UserCog } from 'lucide-react';

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
    if (currentUser && currentUser.role !== 'org_admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'manager') {
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
          name: form.name, phone: form.phone, role: form.role,
        });
      }
      setIsModalOpen(false);
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally { setSubmitting(false); }
  }

  async function toggleActive(user: User) {
    try {
      await api.patch(`/users/${user._id}`, { isActive: !user.isActive });
      loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  }

  if (!currentUser || (currentUser.role !== 'org_admin' && currentUser.role !== 'super_admin' && currentUser.role !== 'manager')) return null;

  const roleBadges: Record<string, { label: string; bg: string; text: string }> = {
    super_admin: { label: 'Super Admin', bg: 'bg-purple-100', text: 'text-purple-700' },
    org_admin:   { label: 'Org Admin',   bg: 'bg-blue-100',   text: 'text-blue-700' },
    manager:     { label: 'Manager',     bg: 'bg-emerald-100', text: 'text-emerald-700' },
    sales_agent: { label: 'Sales Agent', bg: 'bg-amber-100',  text: 'text-amber-700' },
    onsite_visitor: { label: 'Onsite Visitor', bg: 'bg-sky-100', text: 'text-sky-700' },
  };

  return (
    <div className="space-y-6 animate-fade-in p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCog className="text-indigo-600" size={24} /> Team Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">Manage team members, roles, and access credentials</p>
        </div>
        <button
          onClick={openInvite}
          className="h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Team Member</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="animate-spin mx-auto mb-2" size={24} />
            <span className="text-xs font-semibold">Loading team members...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <UserIcon size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">No team members found</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Member</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Phone</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Joined</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((u) => {
                const badge = roleBadges[u.role] || roleBadges.sales_agent;
                return (
                  <tr key={u._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center shrink-0 border border-indigo-100">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-5">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 font-mono text-slate-600">
                      {u.phone || '—'}
                    </td>

                    <td className="py-3.5 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-slate-500 font-medium">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] font-bold transition-all"
                        >
                          Edit
                        </button>
                        {u._id !== currentUser.id && (
                          <button
                            onClick={() => toggleActive(u)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${u.isActive ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Invite / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCog size={18} className="text-indigo-600" />
                {modalMode === 'invite' ? 'Add New Team Member' : 'Edit Team Member'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={modalMode === 'edit'}
                  placeholder="rahul@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
                />
              </div>

              {modalMode === 'invite' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter account password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="sales_agent">Sales Agent (Sales Person)</option>
                  <option value="onsite_visitor">Onsite Visitor</option>
                  <option value="manager">Manager</option>
                  {currentUser.role === 'org_admin' || currentUser.role === 'super_admin' ? (
                    <option value="org_admin">Org Admin</option>
                  ) : null}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5"
                >
                  {submitting ? <Loader2 className="animate-spin" size={14} /> : (modalMode === 'invite' ? 'Create Member' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
