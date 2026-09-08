'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import {
  ChevronLeft, User, Phone, Mail, Building2,
  IndianRupee, UserCheck, MapPin, Landmark,
  Compass, Briefcase, FileText, ChevronDown, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { AgentSelector } from '@/components/features/AgentSelector';
import { IUser } from '@/models/User';

const PUNE_REGIONS = [
  'North Pune (Bhosari, Akurdi, Chakan, Nigdi)',
  'South Pune (Katraj, Kondhwa, Bibwewadi, Dhankawadi)',
  'East Pune (Viman Nagar, Kharadi, Hadapsar, Wagholi, Kalyani Nagar)',
  'West Pune (Baner, Balewadi, Aundh, Hinjawadi, Wakad, Pashan, Kothrud)',
  'Central Pune (Shivajinagar, FC Road, Camp, Swargate, Deccan)',
  'Pimpri-Chinchwad (PCMC)',
  'Outskirts / Rural Pune',
  'Other Region',
];

const DOMAINS = [
  'Home Loan / Housing Loan',
  'Personal Loan',
  'Education Loan / Student Loan',
  'Car Loan / Auto Loan',
  'Two-Wheeler Loan',
  'Business Loan / Commercial Loan',
  'Loan Against Property (LAP)',
  'Gold Loan',
  'Commercial Vehicle Loan',
  'Agriculture / Farm Loan',
  'Mortgage / Refinance Loan',
  'Medical / Emergency Loan',
  'MSME / SME Loan',
  'Project / Construction Loan',
  'Other Loan Category',
];

const SOURCES = ['Website', 'Referral', 'Social Media', 'Cold Call', 'Email Campaign', 'WhatsApp', 'Walk-in', 'Other'];

export default function NewClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [orgUsers, setOrgUsers] = useState<IUser[]>([]);

  const [form, setForm] = useState({
    name: '',
    phone: '',
    secondaryPhone: '',
    email: '',
    company: '',
    flatNo: '',
    address: '',
    landmark: '',
    area: '',
    pincode: '',
    region: 'West Pune (Baner, Balewadi, Aundh, Hinjawadi, Wakad, Pashan, Kothrud)',
    industry: 'Home Loan / Housing Loan',
    source: 'Website',
    status: 'new',
    assignedTo: '',
    value: '',
    notes: '',
  });

  useEffect(() => {
    if (user && user.role === 'super_admin') {
      router.push('/leads');
      return;
    }
    api.get<{ users: IUser[] }>('/users?role=sales_agent,onsite_visitor')
      .then(d => setOrgUsers(d.users))
      .catch(console.error);
  }, [user, router]);

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Client / Lead name is required.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Primary phone number is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: form.value ? parseFloat(form.value) : undefined,
        assignedTo: form.assignedTo || (user?.role === 'sales_agent' ? user.id : undefined),
      };
      const data = await api.post<{ lead: { _id: string } }>('/leads', payload);
      setSaved(true);
      setTimeout(() => router.push(`/leads/${data.lead._id}`), 800);
    } catch (err: any) {
      setError(err.message || 'Failed to register new lead.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-4 py-2.5 placeholder:text-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none h-11";
  const labelClass = "block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-0.5";
  const sectionClass = "bg-white border border-slate-200/80 rounded-2xl overflow-hidden mb-8 shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50/50 pb-32 pt-8 px-3 md:px-10">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <Link 
          href="/leads" 
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-all mb-6 uppercase tracking-wider"
        >
          <ChevronLeft size={16} strokeWidth={2.5} /> Back to Leads Dashboard
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Add New Lead</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
            Register lead details, region location, domain sector, and contact info.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 1. BASIC CONTACT INFORMATION */}
          <div className={sectionClass}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                <User size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">1. Basic Contact Information</h2>
                <p className="text-[11px] text-slate-400 font-medium">Core contact & business identification</p>
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-8">
                <label className={labelClass}>Client / Lead Name <span className="text-red-500 font-bold">*</span></label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <input
                    type="text"
                    placeholder="Full client or contact name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: '44px' }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>Primary Phone <span className="text-red-500 font-bold">*</span></label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <input
                    type="tel"
                    placeholder="Mobile / Call number"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>Secondary Phone / WhatsApp</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <input
                    type="tel"
                    placeholder="Alternative contact"
                    value={form.secondaryPhone}
                    onChange={e => set('secondaryPhone', e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <input
                    type="email"
                    placeholder="client@company.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>Company / Organization</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <input
                    type="text"
                    placeholder="Business / Firm name"
                    value={form.company}
                    onChange={e => set('company', e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. PROPER ADDRESS FORMAT */}
          <div className={sectionClass}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <MapPin size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">2. Address & Location Format</h2>
                <p className="text-[11px] text-slate-400 font-medium">Structured address & physical location details</p>
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4">
                <label className={labelClass}>Flat / Unit / Door No.</label>
                <input
                  type="text"
                  placeholder="e.g. Office 302, Bldg A"
                  value={form.flatNo}
                  onChange={e => set('flatNo', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-8">
                <label className={labelClass}>Street Address / Premises</label>
                <input
                  type="text"
                  placeholder="e.g. Senapati Bapat Road, Commercial Complex"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-5">
                <label className={labelClass}>Landmark</label>
                <div className="relative">
                  <Landmark size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <input
                    type="text"
                    placeholder="e.g. Near Pavilion Mall"
                    value={form.landmark}
                    onChange={e => set('landmark', e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>Area / Locality</label>
                <input
                  type="text"
                  placeholder="e.g. Baner / Shivajinagar"
                  value={form.area}
                  onChange={e => set('area', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-3">
                <label className={labelClass}>Pincode</label>
                <input
                  type="text"
                  placeholder="6 Digits"
                  value={form.pincode}
                  onChange={e => set('pincode', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* 3. REGION & DOMAIN SECTOR */}
          <div className={sectionClass}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                <Compass size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">3. Region & Loan Category</h2>
                <p className="text-[11px] text-slate-400 font-medium">Select Pune zone & loan type category</p>
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* PUNE REGION SECTION */}
              <div className="md:col-span-6">
                <label className={labelClass}>Region Zone (Pune Location)</label>
                <div className="relative">
                  <Compass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <select
                    value={form.region}
                    onChange={e => set('region', e.target.value)}
                    className={`${inputClass} appearance-none pr-10`}
                    style={{ paddingLeft: '44px' }}
                  >
                    {PUNE_REGIONS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              {/* LOAN CATEGORY SECTION */}
              <div className="md:col-span-6">
                <label className={labelClass}>Loan Category / Type</label>
                <div className="relative">
                  <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <select
                    value={form.industry}
                    onChange={e => set('industry', e.target.value)}
                    className={`${inputClass} appearance-none pr-10`}
                    style={{ paddingLeft: '44px' }}
                  >
                    {DOMAINS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* 4. DEAL LOGISTICS & NOTES */}
          <div className={sectionClass}>
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-sm">
                <UserCheck size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">4. Deal & Sales Logistics</h2>
                <p className="text-[11px] text-slate-400 font-medium">Assignment, deal value, source & notes</p>
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-5">
              <div className="md:col-span-4">
                <label className={labelClass}>Estimated Deal Value (₹)</label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <input
                    type="number"
                    placeholder="e.g. 500000"
                    value={form.value}
                    onChange={e => set('value', e.target.value)}
                    className={inputClass}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>Lead Source</label>
                <div className="relative">
                  <select
                    value={form.source}
                    onChange={e => set('source', e.target.value)}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>Assigned Sales Consultant</label>
                <AgentSelector
                  agents={orgUsers}
                  selectedId={form.assignedTo}
                  onSelect={(id) => set('assignedTo', id)}
                />
              </div>

              <div className="md:col-span-12">
                <label className={labelClass}>Requirements / Call Notes</label>
                <textarea
                  rows={3}
                  placeholder="Enter specific requirements, client discussion summary, or follow-up notes..."
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  className={`${inputClass} !h-auto py-3 resize-none`}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          {/* Sticky Actions Footer */}
          <div className="sticky bottom-6 flex items-center gap-4 justify-end p-4 bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl z-20">
            <Link 
              href="/leads" 
              className="px-6 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-all uppercase tracking-wider"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || saved}
              className={`px-8 py-3 text-xs font-bold text-white rounded-xl transition-all shadow-md flex items-center gap-2 ${
                saved 
                  ? 'bg-emerald-600' 
                  : saving 
                  ? 'bg-indigo-400 cursor-wait' 
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98]'
              }`}
            >
              {saved ? (
                <>
                  <CheckCircle2 size={16} /> Registered Successfully!
                </>
              ) : saving ? (
                'Saving Lead...'
              ) : (
                'Save & Create Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
