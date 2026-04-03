'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import { ChevronLeft, User, Phone, Mail, Building2, Tag, DollarSign, FileText, UserCheck, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface OrgUser { _id: string; name: string; role: string; }

const SOURCES = ['Website', 'Referral', 'Social Media', 'Cold Call', 'Email Campaign', 'WhatsApp', 'Walk-in', 'Import', 'Other'];
const STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'won', 'lost'];

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'Website',
    status: 'new',
    assignedTo: '',
    value: '',
    notes: '',
    tags: '',
  });

  const canAccess = user?.role === 'org_admin' || user?.role === 'manager';

  useEffect(() => {
    if (!canAccess) { router.push('/leads'); return; }
    api.get<{ users: OrgUser[] }>('/users?role=sales_agent')
      .then(d => setOrgUsers(d.users))
      .catch(console.error);
  }, [canAccess, router]);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Lead name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: form.value ? parseFloat(form.value) : undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        assignedTo: form.assignedTo || undefined,
      };
      const data = await api.post<{ lead: { _id: string } }>('/leads', payload);
      setSaved(true);
      setTimeout(() => router.push(`/leads/${data.lead._id}`), 800);
    } catch (err: any) {
      setError(err.message || 'Failed to create lead. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full text-sm text-gray-900 bg-white border border-gray-200 rounded-xl px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2";

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Back nav */}
      <Link href="/leads" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-8 group">
        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
        Back to Leads
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Add New Lead</h1>
        <p className="text-sm text-gray-500 mt-1">Manually add a new lead into your CRM pipeline.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Contact Information ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <User size={15} className="text-indigo-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Contact Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}><Mail size={11} className="inline mr-1" />Email</label>
              <input type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}><Phone size={11} className="inline mr-1" />Phone</label>
              <input type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}><Building2 size={11} className="inline mr-1" />Company</label>
              <input type="text" placeholder="Company name" value={form.company} onChange={e => set('company', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}><DollarSign size={11} className="inline mr-1" />Deal Value (₹)</label>
              <input type="number" placeholder="0" min="0" value={form.value} onChange={e => set('value', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* ── Lead Details ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Tag size={15} className="text-emerald-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Lead Details</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className={inputClass}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inputClass}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}><Tag size={11} className="inline mr-1" />Tags</label>
              <input type="text" placeholder="hot, premium, followup (comma separated)" value={form.tags} onChange={e => set('tags', e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        {/* ── Assignment ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <UserCheck size={15} className="text-blue-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Assign To</h2>
          </div>
          <div className="p-6">
            <label className={labelClass}>Sales Person</label>
            <select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} className={inputClass}>
              <option value="">Auto-assign / Unassigned</option>
              {orgUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-2">Leave blank to assign to yourself automatically.</p>
          </div>
        </div>

        {/* ── Notes ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
              <FileText size={15} className="text-amber-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Notes</h2>
          </div>
          <div className="p-6">
            <textarea
              rows={4}
              placeholder="Any context about this lead — where they came from, what they need, etc."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
            <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0 text-xs font-black">!</span>
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 justify-end">
          <Link href="/leads" className="px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || saved}
            className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-lg shadow-indigo-100 ${
              saved ? 'bg-emerald-500 shadow-emerald-100' :
              saving ? 'bg-indigo-400 cursor-not-allowed' :
              'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
            }`}
          >
            {saved ? <><CheckCircle size={15} /> Lead Created!</> :
             saving ? <><Loader2 size={15} className="animate-spin" /> Creating...</> :
             'Create Lead'}
          </button>
        </div>
      </form>
    </div>
  );
}
