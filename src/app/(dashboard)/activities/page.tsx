'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Phone, Calendar, Mail, MessageSquare, FileText, CheckCircle2, Clock, Filter, User as UserIcon, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Activity {
  _id: string;
  type: string;
  outcome?: string;
  notes: string;
  subject?: string;
  createdAt: string;
  createdBy?: { _id: string; name: string; avatar?: string } | null;
  leadId?: { _id: string; name: string; phone?: string; email?: string } | null;
}

interface User {
  _id: string;
  name: string;
  role: string;
}

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; text: string; label: string }> = {
  call:     { icon: <Phone size={14} />,        color: '#6366f1', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', label: 'Call' },
  meeting:  { icon: <Calendar size={14} />,     color: '#a855f7', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', label: 'Meeting' },
  email:    { icon: <Mail size={14} />,          color: '#0ea5e9', bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-600', label: 'Email' },
  whatsapp: { icon: <MessageCircle size={14} />, color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', label: 'WhatsApp' },
  note:     { icon: <FileText size={14} />,      color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', label: 'Note' },
};

export default function ActivitiesPage() {
  const { user: authUser } = useAuth();
  const isAdminOrManager = authUser?.role === 'admin' || authUser?.role === 'manager';

  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');

  async function loadUsers() {
    if (!isAdminOrManager) return;
    try {
      const data = await api.get<{ users: User[] }>('/users?limit=100');
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load users for filter');
    }
  }

  async function loadActivities() {
    setLoading(true);
    try {
      let url = `/activities?page=${page}&limit=20`;
      if (typeFilter !== 'all') url += `&type=${typeFilter}`;
      if (userFilter !== 'all') url += `&createdBy=${userFilter}`;
      
      const data = await api.get<{ activities: Activity[]; pages: number }>(url);
      setActivities(data.activities);
      setTotalPages(data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [isAdminOrManager]);

  useEffect(() => {
    loadActivities();
  }, [page, typeFilter, userFilter]);

  return (
    <div className="max-w-6xl">
      {/* Header & Stats */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Team Activities</h1>
          <p className="text-sm text-gray-500 font-medium">Tracking interactions across your entire organization.</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-1.5 px-3 border-r border-gray-100 mr-1">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filters</span>
          </div>

          {/* Type Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              className="bg-gray-50 border-none text-[11px] font-bold text-gray-700 px-3 py-1.5 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">All Activities</option>
              <option value="call">Calls Only</option>
              <option value="whatsapp">WhatsApp Only</option>
              <option value="email">Emails Only</option>
              <option value="note">Notes Only</option>
            </select>
          </div>

          {/* User Filter (Admin/Manager Only) */}
          {isAdminOrManager && (
            <div className="flex items-center gap-2">
              <select
                value={userFilter}
                onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
                className="bg-gray-50 border-none text-[11px] font-bold text-gray-700 px-3 py-1.5 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">Every Salesperson</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Feed...</span>
        </div>
      ) : activities.length === 0 ? (
        <div className="card py-20 text-center bg-white border border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
            <MessageSquare className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No matches found</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">Adjust your filters or interaction logs for your team's activities.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((act) => {
            const meta = TYPE_META[act.type] ?? TYPE_META['note'];
            return (
              <div key={act._id} className="group relative flex gap-6 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all hover:-translate-y-1">
                {/* Timeline Spine Component */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-12 h-12 rounded-2xl ${meta.bg} ${meta.text} flex items-center justify-center shadow-sm border ${meta.border} group-hover:scale-110 transition-transform`}>
                    {meta.icon}
                  </div>
                  <div className="flex-1 w-0.5 bg-gray-50 mt-4 group-last:hidden" />
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-black text-gray-900">{act.createdBy?.name || 'System'}</span>
                       <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${meta.bg} ${meta.text}`}>
                          {meta.label}
                       </span>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 capitalize">
                          <Clock className="w-3.5 h-3.5 opacity-50" />
                          {new Date(act.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                       </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-gray-50/50 border border-gray-50 group-hover:bg-white group-hover:border-indigo-100 transition-colors">
                    {act.leadId && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600">
                           <UserIcon size={12} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">Interaction with:</span>
                        <a href={`/leads/${act.leadId._id}`} className="text-xs font-black text-indigo-600 hover:underline">
                           {act.leadId.name}
                        </a>
                      </div>
                    )}

                    {act.outcome && (
                       <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span className="text-[11px] font-black text-emerald-600 uppercase tracking-wider">{act.outcome.replace(/_/g, ' ')}</span>
                       </div>
                    )}

                    <p className="text-sm text-gray-600 leading-relaxed italic">
                      "{act.notes || 'No description provided'}"
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-6">
          <button 
            disabled={page === 1} 
            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md disabled:opacity-30 transition-all font-bold text-xs uppercase tracking-widest text-gray-600"
          >
            Prev
          </button>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Page {page} <span className="mx-1 text-gray-200">/</span> {totalPages}
          </span>
          <button 
            disabled={page === totalPages} 
            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md disabled:opacity-30 transition-all font-bold text-xs uppercase tracking-widest text-gray-600"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
