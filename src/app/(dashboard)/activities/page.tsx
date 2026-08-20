'use client';

import * as React from 'react';
import { useEffect, useState, Suspense } from 'react';
import { api } from '@/lib/api-client';
import { Phone, Calendar, Mail, MessageCircle, FileText, CheckCircle2, Clock, Filter, User as UserIcon, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';

import { useRouter, useSearchParams } from 'next/navigation';

interface Activity {
  _id: string;
  type: string;
  duration?: number;
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
  call:     { icon: <Phone size={16} />,        color: '#3b82f6', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', label: 'Call' },
  meeting:  { icon: <Calendar size={16} />,     color: '#a855f7', bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', label: 'Meeting' },
  email:    { icon: <Mail size={16} />,          color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-600', label: 'Email' },
  whatsapp: { icon: <MessageCircle size={16} />, color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', label: 'WhatsApp' },
  note:     { icon: <FileText size={16} />,      color: '#f59e0b', bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', label: 'Note' },
};

function toTitleCase(str: string) {
  return str.toLowerCase().split(' ').map(s => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
}

const formatDuration = (s: number) => {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function ActivitiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: authUser } = useAuth();
  const isAdminOrManager = authUser?.role === 'admin' || authUser?.role === 'manager';

  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const typeParam = searchParams.get('type') || 'all';
  const userParam = searchParams.get('createdBy') || 'all';

  const [activities, setActivities] = useState<Activity[]>([]);
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(isNaN(pageParam) || pageParam < 1 ? 1 : pageParam);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState(typeParam);
  const [userFilter, setUserFilter] = useState(userParam);

  useEffect(() => {
    const p = parseInt(searchParams.get('page') || '1', 10);
    setPage(isNaN(p) || p < 1 ? 1 : p);
    setTypeFilter(searchParams.get('type') || 'all');
    setUserFilter(searchParams.get('createdBy') || 'all');
  }, [searchParams]);

  const updateUrl = (overrides: Record<string, string | number>) => {
    const current = {
      page,
      type: typeFilter,
      createdBy: userFilter,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (current.page && current.page > 1) params.set('page', String(current.page));
    if (current.type && current.type !== 'all') params.set('type', current.type);
    if (current.createdBy && current.createdBy !== 'all') params.set('createdBy', current.createdBy);

    const str = params.toString();
    const targetUrl = str ? `/activities?${str}` : '/activities';
    router.push(targetUrl);
  };

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
    <div className="animate-fade-in space-y-10">
      <PageHeader
        title="Activities Feed"
        subtitle="Monitoring the pulse of your sales operations"
      />

      <div className="h-8" /> {/* Guaranteed spacer */}

      <div className="w-full">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-[#e6e8ec] shadow-sm mb-12">
            <select
              value={typeFilter}
              onChange={(e) => { const v = e.target.value; setTypeFilter(v); updateUrl({ type: v, page: 1 }); }}
              className="bg-gray-50 border-none text-[11px] font-bold text-gray-700 px-4 py-2 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">Every Channel</option>
              {Object.keys(TYPE_META).map(key => (
                <option key={key} value={key}>{TYPE_META[key].label}</option>
              ))}
            </select>

            {isAdminOrManager && (
              <select
                value={userFilter}
                onChange={(e) => { const v = e.target.value; setUserFilter(v); updateUrl({ createdBy: v, page: 1 }); }}
                className="bg-gray-50 border-none text-[11px] font-bold text-gray-700 px-4 py-2 rounded-xl outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">All Agents</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
            )}
          </div>
        {/* Note: max-w-4xl continues below to wrap the feed */}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing Feed...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-32 text-center bg-white border border-dashed border-[#e6e8ec] rounded-3xl">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-6 border border-gray-100">
              <MessageSquare className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 tracking-tight">No activities yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">Try adjusting your filters or wait for your team to log new interactions.</p>
          </div>
        ) : (
          <div className="relative flex flex-col gap-8 group/timeline">
            {/* The Spine Line */}
            <div className="absolute left-6 top-10 bottom-10 w-0.5 bg-[#e6e8ec] z-0 hidden sm:block" />

            {activities.map((act) => {
              const meta = TYPE_META[act.type] ?? TYPE_META['note'];
              return (
                <div key={act._id} className="relative flex items-start gap-10 z-10 group">
                  {/* Icon Node */}
                  <div className="hidden sm:flex flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full ${meta.bg} ${meta.text} flex items-center justify-center shadow-lg shadow-white border border-white ring-4 ring-[#f7f8fa] z-20 group-hover:scale-110 transition-transform duration-300`}>
                      {meta.icon}
                    </div>
                  </div>

                  {/* Activity Card */}
                  <div className="flex-1 bg-white p-10 sm:p-12 rounded border border-[#e6e8ec] shadow-sm hover:shadow-lg hover:shadow-gray-200/40 transition-all duration-300">
                    
                    {/* LINE 1: HEADER (Sentence Template) */}
                    <div className="flex items-center justify-between gap-6 mb-4">
                      <div className="text-[15px] text-gray-900 leading-tight">
                        <span className="font-semibold">{toTitleCase(act.createdBy?.name || 'System')}</span>
                        {act.type === 'call' && (
                          <span className="text-gray-500"> {act.outcome === 'connected' ? 'completed a call with' : 'started a call with'} </span>
                        )}
                        {act.type === 'email' && (
                          <span className="text-gray-500"> sent a follow-up email to </span>
                        )}
                        {act.type === 'note' && (
                          <span className="text-gray-500"> added a note for </span>
                        )}
                        {act.type === 'whatsapp' && (
                          <span className="text-gray-500"> sent a WhatsApp message to </span>
                        )}
                        {act.type === 'meeting' && (
                          <span className="text-gray-500"> has a meeting with </span>
                        )}
                        <Link 
                          href={`/leads/${act.leadId?._id}`}
                          className="font-semibold text-indigo-600 hover:underline decoration-2 underline-offset-4"
                        >
                          {toTitleCase(act.leadId?.name || 'Unknown')}
                        </Link>
                      </div>
                      
                      <span className="text-[12px] font-medium text-gray-300 tabular-nums whitespace-nowrap">
                        {new Date(act.createdAt).toLocaleString(undefined, { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    {/* LINE 2: SUMMARY / PREVIEW */}
                    <div className="mb-4">
                       <p className="text-[14px] text-gray-500 font-normal">
                          {act.type === 'call' && act.outcome === 'connected' && 'Call completed successfully'}
                          {act.type === 'call' && act.outcome !== 'connected' && ('Started a call with ' + toTitleCase(act.leadId?.name || 'lead'))}
                          {act.type === 'email' && 'Sent a follow-up email'}
                          {act.type === 'note' && ('Added a call note for ' + toTitleCase(act.leadId?.name || 'lead'))}
                          {act.type === 'whatsapp' && act.notes && `“${act.notes.substring(0, 80)}${act.notes.length > 80 ? '...' : ''}”`}
                          {act.type === 'meeting' && (act.notes || 'Meeting scheduled')}
                       </p>
                    </div>

                    {/* LINE 3: DURATION - Only if duration exists */}
                    {act.type === 'call' && typeof act.duration === 'number' && act.duration >= 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-md border border-emerald-100 uppercase inline-flex mt-1">
                        <Clock className="w-3 h-3" />
                        {(() => {
                          const d = act.duration || 0;
                          if (d < 60) return `${d}S`;
                          const m = Math.floor(d / 60);
                          const s = d % 60;
                          return s > 0 ? `${m}M ${s}S` : `${m}M`;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-20 flex items-center justify-center gap-10">
            <button 
              disabled={page === 1} 
              onClick={() => { const p = Math.max(1, page - 1); setPage(p); updateUrl({ page: p }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="px-6 py-3 rounded-2xl bg-white border border-[#e6e8ec] shadow-sm hover:shadow-md disabled:opacity-30 transition-all font-black text-[10px] uppercase tracking-widest text-gray-500 hover:text-indigo-600"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Page</span>
               <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-black">{page}</span>
               <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">of {totalPages}</span>
            </div>
            <button 
              disabled={page === totalPages} 
              onClick={() => { const p = page + 1; setPage(p); updateUrl({ page: p }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="px-6 py-3 rounded-2xl bg-white border border-[#e6e8ec] shadow-sm hover:shadow-md disabled:opacity-30 transition-all font-black text-[10px] uppercase tracking-widest text-gray-500 hover:text-indigo-600"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin border-indigo-600" />
        </div>
      }
    >
      <ActivitiesContent />
    </React.Suspense>
  );
}
