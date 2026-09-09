'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import {
  ChevronLeft, User, Phone, MapPin, Landmark,
  IndianRupee, CheckCircle2, Briefcase, FileText
} from 'lucide-react';
import Link from 'next/link';
import { AgentSelector } from '@/components/features/AgentSelector';
import { IUser } from '@/models/User';

const LOAN_TYPES = [
  'Home Loan / Housing Loan',
  'Personal Loan',
  'Business Loan / Commercial Loan',
  'Loan Against Property (LAP)',
  'Car Loan / Auto Loan',
  'Education Loan / Student Loan',
  'MSME / SME Loan',
  'Gold Loan',
  'Commercial Vehicle Loan',
  'Mortgage Balance Transfer / Refinance',
  'Project / Construction Loan',
  'Two-Wheeler Loan',
  'Other Loan Category',
];

export default function BasicLoanInquiryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [orgUsers, setOrgUsers] = useState<IUser[]>([]);

  // Simple, focused form state
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    industry: 'Home Loan / Housing Loan', // What loan they want
    value: '', // Loan amount desired
    notes: '',
    assignedTo: '',
  });

  useEffect(() => {
    if (user && user.role === 'super_admin') {
      router.push('/leads');
      return;
    }
    api.get<{ users: IUser[] }>('/users?role=sales_agent,onsite_visitor,operator,manager')
      .then(d => setOrgUsers(d.users || []))
      .catch(console.error);
  }, [user, router]);

  function setField(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Mobile / Contact number is required.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || undefined,
        industry: form.industry, // What loan they want
        value: form.value ? parseFloat(form.value) : 0,
        notes: form.notes.trim() || undefined,
        assignedTo: form.assignedTo || (user?.role === 'sales_agent' ? user.id : undefined),
        source: 'Loan Inquiry',
      };

      const data = await api.post<{ lead: { _id: string } }>('/leads', payload);
      setSaved(true);
      setTimeout(() => router.push(`/leads/${data.lead._id}`), 600);
    } catch (err: any) {
      setError(err.message || 'Failed to submit loan inquiry.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-3 placeholder:text-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all outline-none h-12";
  const labelClass = "block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 ml-0.5";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 pt-6 px-4 md:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Navigation */}
        <Link 
          href="/leads" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-all mb-4 uppercase tracking-wider"
        >
          <ChevronLeft size={16} strokeWidth={2.5} /> Back to Leads Dashboard
        </Link>

        {/* Card Header */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Landmark size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Loan Inquiry Form
              </h1>
              <p className="text-xs font-medium text-slate-500">
                Quick entry for customer loan inquiries
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* 1. Customer Name */}
            <div>
              <label className={labelClass}>
                Customer Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <input
                  type="text"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  className={inputClass}
                  style={{ paddingLeft: '44px' }}
                  autoFocus
                />
              </div>
            </div>

            {/* 2. Mobile / Contact Number */}
            <div>
              <label className={labelClass}>
                Contact Number <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={form.phone}
                  onChange={e => setField('phone', e.target.value)}
                  className={inputClass}
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

            {/* 3. Address */}
            <div>
              <label className={labelClass}>
                Customer Address / Area
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <input
                  type="text"
                  placeholder="e.g. Flat 302, Baner, Pune"
                  value={form.address}
                  onChange={e => setField('address', e.target.value)}
                  className={inputClass}
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

            {/* 4. What Loan They Want */}
            <div>
              <label className={labelClass}>
                What Loan Do They Want? <span className="text-rose-500 font-bold">*</span>
              </label>
              <div className="relative">
                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500 z-10" />
                <select
                  value={form.industry}
                  onChange={e => setField('industry', e.target.value)}
                  className={`${inputClass} appearance-none pr-10 cursor-pointer font-bold text-indigo-900 bg-indigo-50/20 border-indigo-200`}
                  style={{ paddingLeft: '44px' }}
                >
                  {LOAN_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 5. Loan Amount (Optional / Helpful) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  Loan Amount Needed (₹)
                </label>
                <div className="relative">
                  <IndianRupee size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <input
                    type="number"
                    placeholder="e.g. 2500000"
                    value={form.value}
                    onChange={e => setField('value', e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              {/* Assigned Agent */}
              <div>
                <label className={labelClass}>
                  Assign To Loan Officer
                </label>
                <AgentSelector
                  agents={orgUsers}
                  selectedId={form.assignedTo}
                  onSelect={(id) => setField('assignedTo', id)}
                />
              </div>
            </div>

            {/* 6. Remarks / Note */}
            <div>
              <label className={labelClass}>
                Notes / Discussion (Optional)
              </label>
              <div className="relative">
                <FileText size={18} className="absolute left-4 top-3 text-slate-400 z-10" />
                <textarea
                  rows={2}
                  placeholder="Any specific requirement or customer notes..."
                  value={form.notes}
                  onChange={e => setField('notes', e.target.value)}
                  className={`${inputClass} !h-auto py-3 resize-none font-normal`}
                  style={{ paddingLeft: '44px' }}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold text-xs flex items-center gap-2 animate-shake">
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-3 flex items-center justify-end gap-3">
              <Link 
                href="/leads" 
                className="px-5 py-3 text-xs font-bold text-slate-400 hover:text-slate-700 transition-all uppercase tracking-wider"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving || saved}
                className={`flex-1 sm:flex-initial px-8 py-3.5 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  saved 
                    ? 'bg-emerald-600' 
                    : saving 
                    ? 'bg-indigo-400 cursor-wait' 
                    : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
                }`}
              >
                {saved ? (
                  <>
                    <CheckCircle2 size={16} /> Inquiry Saved!
                  </>
                ) : saving ? (
                  'Saving Inquiry...'
                ) : (
                  <>
                    <Landmark size={16} /> Submit Loan Inquiry
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
