'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import {
  ChevronLeft, User, Phone, Mail, Building2, Tag,
  IndianRupee, FileText, UserCheck, Loader2, CheckCircle,
  Users, MapPin, HeartPulse, GraduationCap,
  ChevronDown, Landmark, Map, Briefcase, Calendar
} from 'lucide-react';
import Link from 'next/link';

interface OrgUser { _id: string; name: string; role: string; }

const SOURCES = ['Website', 'Referral', 'Social Media', 'Cold Call', 'Email Campaign', 'WhatsApp', 'Walk-in', 'Import', 'Other'];
const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);

  const [timeHour, setTimeHour] = useState('10');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timePeriod, setTimePeriod] = useState('AM');

  const [form, setForm] = useState({
    name: '', email: '', phone: '', secondaryPhone: '', company: '',
    source: 'Website', status: 'new', assignedTo: '', value: '',
    notes: '', tags: '', address: '', flatNo: '', landmark: '',
    area: '', pincode: '', mapLink: '', income: '', occupation: '',
    education: '', dateOfVisit: '', timeOfVisit: '',
    hasMedeclaim: false, sumAssured: '', insuranceCompany: '',
    healthStatus: { fit: true, bp: false, sugar: false, heart: false, kidney: false, liver: false },
    familyAges: { husband: '', wife: '', child1: '', child2: '', mother: '', father: '' },
    tseName: '', tlName: '', visitDate: new Date().toISOString().split('T')[0],
  });

  const canAccess = user?.role === 'org_admin' || user?.role === 'manager';

  useEffect(() => {
    if (!canAccess) { router.push('/leads'); return; }
    api.get<{ users: OrgUser[] }>('/users?role=sales_agent,onsite_visitor')
      .then(d => setOrgUsers(d.users))
      .catch(console.error);
  }, [canAccess, router]);

  useEffect(() => {
    setForm(prev => ({ ...prev, timeOfVisit: `${timeHour}:${timeMinute} ${timePeriod}` }));
  }, [timeHour, timeMinute, timePeriod]);

  function set(field: string, value: any) { setForm(prev => ({ ...prev, [field]: value })); setError(''); }
  function setHealth(field: keyof typeof form.healthStatus) { setForm(prev => ({ ...prev, healthStatus: { ...prev.healthStatus, [field]: !prev.healthStatus[field] } })); }
  function setFamily(field: keyof typeof form.familyAges, value: string) { setForm(prev => ({ ...prev, familyAges: { ...prev.familyAges, [field]: value } })); }

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
        familyAges: Object.fromEntries(Object.entries(form.familyAges).map(([k, v]) => [k, v ? parseInt(v) : undefined])),
      };
      const data = await api.post<{ lead: { _id: string } }>('/leads', payload);
      setSaved(true);
      setTimeout(() => router.push(`/leads/${data.lead._id}`), 1000);
    } catch (err: any) { setError(err.message || 'Failed to create lead.'); } finally { setSaving(false); }
  }

  // RECTANGULAR DESIGN SYSTEM (Professional & Compact)
  const inputClass = "w-full text-[13px] font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-4 py-2.5 placeholder:text-slate-300 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all outline-none h-11";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-0.5";
  const sectionClass = "bg-white border border-slate-200 rounded-lg overflow-hidden mb-12 shadow-sm";

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32 pt-12 px-2 md:px-10">
      <div className="max-w-6xl mx-auto">

        {/* Navigation */}
        <Link href="/leads" className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-blue-600 transition-all mb-10 uppercase tracking-[0.3em]">
          <ChevronLeft size={14} strokeWidth={4} /> Back to Leads
        </Link>

        {/* Header */}
        <div className="mb-10 pl-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Lead Entry</h1>
          <p className="text-xs font-medium text-slate-400 mt-2">Enter detailed client information to register a new lead in the system.</p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* 1. CONTACT & ADDRESS */}
          <div className={sectionClass}>
            <div className="flex items-center gap-3 px-8 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <User size={18} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">1. Client Contact & Address</h2>
            </div>

            <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-8">
              <div className="md:col-span-8">
                <label className={labelClass}>Client Name <span className="text-red-500 font-bold">*</span></label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                  <input type="text" placeholder="e.g. Mukund Kamble" value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} style={{ paddingLeft: '48px' }} autoFocus />
                </div>
              </div>
              <div className="md:col-span-4">
                <label className={labelClass}>Primary Mobile No</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                  <input type="tel" placeholder="9689108528" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} style={{ paddingLeft: '48px' }} />
                </div>
              </div>

              <div className="md:col-span-6">
                <label className={labelClass}>Secondary Mobile No</label>
                <input type="tel" placeholder="Alternative Number (Optional)" value={form.secondaryPhone} onChange={e => set('secondaryPhone', e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-6">
                <label className={labelClass}>Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                  <input type="email" placeholder="email@example.com" value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} style={{ paddingLeft: '48px' }} />
                </div>
              </div>

              <div className="md:col-span-12">
                <label className={labelClass}>Full Address</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                  <input type="text" placeholder="Street Address / Room Name / Block Details" value={form.address} onChange={e => set('address', e.target.value)} className={inputClass} style={{ paddingLeft: '48px' }} />
                </div>
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>Flat / House No</label>
                <input type="text" placeholder="e.g. Rajgad Bunglow" value={form.flatNo} onChange={e => set('flatNo', e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-8">
                <label className={labelClass}>Landmark</label>
                <div className="relative">
                  <Landmark size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                  <input type="text" placeholder="e.g. Near Indian Petrol Pump" value={form.landmark} onChange={e => set('landmark', e.target.value)} className={inputClass} style={{ paddingLeft: '48px' }} />
                </div>
              </div>

              <div className="md:col-span-6">
                <label className={labelClass}>Area / Locality</label>
                <input type="text" placeholder="e.g. Shikrapur" value={form.area} onChange={e => set('area', e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-6">
                <label className={labelClass}>Second Area Reference</label>
                <input type="text" placeholder="Reference Point" className={inputClass} />
              </div>

              <div className="md:col-span-4">
                <label className={labelClass}>Pincode</label>
                <input type="text" placeholder="412208" value={form.pincode} onChange={e => set('pincode', e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-8">
                <label className={labelClass}>Google Maps Link</label>
                <div className="relative">
                  <Map size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                  <input type="url" placeholder="https://goo.gl/maps/..." value={form.mapLink} onChange={e => set('mapLink', e.target.value)} className={inputClass} style={{ paddingLeft: '48px' }} />
                </div>
              </div>
            </div>
          </div>

          {/* 2. PROFILE & VISIT */}
          <div className={sectionClass}>
            <div className="flex items-center gap-3 px-8 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-sm">
                <GraduationCap size={18} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">2. Professional Profile & Visit</h2>
            </div>
            <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
              <div className="space-y-8">
                <div>
                  <label className={labelClass}>Annual Income</label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                    <input type="text" placeholder="e.g. 15 Lakh/Year" value={form.income} onChange={e => set('income', e.target.value)} className={inputClass} style={{ paddingLeft: '48px' }} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Date of Visit</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                    <input type="date" value={form.dateOfVisit} onChange={e => set('dateOfVisit', e.target.value)} className={inputClass} style={{ paddingLeft: '48px' }} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Time of Visit</label>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={timeHour} onChange={e => setTimeHour(e.target.value)} className={`${inputClass} !px-2 text-center`}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>
                      ))}
                    </select>
                    <select value={timeMinute} onChange={e => setTimeMinute(e.target.value)} className={`${inputClass} !px-2 text-center`}>
                      {Array.from({ length: 60 }).map((_, i) => {
                        const m = String(i).padStart(2, '0');
                        return <option key={m} value={m}>{m}</option>;
                      })}
                    </select>
                    <select value={timePeriod} onChange={e => setTimePeriod(e.target.value)} className={`${inputClass} !px-2 text-center bg-slate-50 font-medium`}>
                      <option value="AM">AM</option> <option value="PM">PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className={labelClass}>Job / Business Type</label>
                  <div className="relative">
                    <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10" />
                    <input type="text" placeholder="e.g. Self Employed / Service" value={form.occupation} onChange={e => set('occupation', e.target.value)} className={inputClass} style={{ paddingLeft: '48px' }} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Highest Education</label>
                  <input type="text" placeholder="e.g. Post-Graduate / MBA" value={form.education} onChange={e => set('education', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Estimated Deal Value (₹)</label>
                  <input type="number" placeholder="0" value={form.value} onChange={e => set('value', e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          {/* 3. HEALTH & INSURANCE */}
          <div className={sectionClass}>
            <div className="flex items-center gap-3 px-8 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <HeartPulse size={18} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">3. Health & Insurance Profile</h2>
            </div>
            <div className="p-8 md:p-10 space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-10">
                <div>
                  <label className={labelClass}>Existing Medeclaim?</label>
                  <div className="relative">
                    <select value={form.hasMedeclaim ? 'yes' : 'no'} onChange={e => set('hasMedeclaim', e.target.value === 'yes')} className="w-full h-11 bg-white border border-slate-200 rounded-lg px-6 text-[13px] font-medium text-slate-700 appearance-none outline-none focus:border-blue-600">
                      <option value="no">No active medeclaim</option>
                      <option value="yes">Yes, currently insured</option>
                    </select>
                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Sum Assured (SA)</label>
                  <input type="text" placeholder="e.g. 5,00,000" value={form.sumAssured} onChange={e => set('sumAssured', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Current Health Summary</label>
                  <input type="text" placeholder="Brief about physical status" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Preferred/Current Insurer</label>
                  <input type="text" placeholder="Company Name" value={form.insuranceCompany} onChange={e => set('insuranceCompany', e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Specific Health Markers</label>
                <div className="flex flex-wrap gap-2.5 mt-4">
                  {Object.keys(form.healthStatus).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setHealth(key as keyof typeof form.healthStatus)}
                      className={`px-6 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${form.healthStatus[key as keyof typeof form.healthStatus]
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300'
                        }`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. FAMILY MEMBERS */}
          <div className={sectionClass}>
            <div className="flex items-center gap-3 px-8 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-sm">
                <Users size={18} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">4. Family Members Age</h2>
            </div>
            <div className="p-8 md:p-10 grid grid-cols-2 md:grid-cols-6 gap-6">
              {['husband', 'wife', 'child1', 'child2', 'mother', 'father'].map((m) => (
                <div key={m}>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 text-center tracking-widest">{m.replace('child', 'Child ')}</label>
                  <input type="number" placeholder="Age" value={form.familyAges[m as keyof typeof form.familyAges]} onChange={e => setFamily(m as keyof typeof form.familyAges, e.target.value)} className={`${inputClass} !px-1 text-center`} />
                </div>
              ))}
            </div>
          </div>

          {/* 5. ASSIGNMENT */}
          <div className={sectionClass}>
            <div className="flex items-center gap-3 px-8 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm">
                <UserCheck size={18} strokeWidth={2.5} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">5. Internal & Assignment</h2>
            </div>
            <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10">
              <div>
                <label className={labelClass}>Sales Person Assignment</label>
                <div className="relative">
                  <select value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} className="w-full h-11 bg-white border border-slate-200 rounded-lg px-6 text-[13px] font-medium text-slate-700 appearance-none outline-none focus:border-blue-600">
                    <option value="">Choose Agent</option>
                    {orgUsers.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                </div>
              </div>
              <div>
                <label className={labelClass}>TSE Name</label>
                <input type="text" placeholder="Assigned TSE" value={form.tseName} onChange={e => set('tseName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>TL Name</label>
                <input type="text" placeholder="Assigned TL" value={form.tlName} onChange={e => set('tlName', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Lead Source</label>
                <div className="relative">
                  <select value={form.source} onChange={e => set('source', e.target.value)} className="w-full h-11 bg-white border border-slate-200 rounded-lg px-6 text-[13px] font-medium text-slate-700 appearance-none outline-none focus:border-blue-600">
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Current Status</label>
                <div className="relative">
                  <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full h-11 bg-white border border-slate-200 rounded-lg px-6 text-[13px] font-medium text-slate-700 appearance-none outline-none focus:border-blue-600">
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                  <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Entry Date</label>
                <input type="date" value={form.visitDate} onChange={e => set('visitDate', e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-1">
                <label className={labelClass}>Keywords / Tags</label>
                <input type="text" placeholder="tags" value={form.tags} onChange={e => set('tags', e.target.value)} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Internal Strategy Notes</label>
                <textarea rows={1} placeholder="Add private notes..." value={form.notes} onChange={e => set('notes', e.target.value)} className={`${inputClass} !h-auto resize-none`} />
              </div>
            </div>
          </div>

          {error && <div className="mb-10 p-6 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold flex items-center gap-3"> {error} </div>}

          <div className="sticky bottom-8 flex items-center gap-4 justify-end p-6 bg-white border border-slate-200 rounded-lg shadow-xl">
            <Link href="/leads" className="px-8 py-3 text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-all"> Cancel </Link>
            <button type="submit" disabled={saving || saved} className={`px-12 py-3.5 text-[12px] font-bold text-white rounded-md transition-all shadow-lg ${saved ? 'bg-emerald-500' : saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200 uppercase tracking-[0.15em]'}`}>
              {saved ? 'Success!' : saving ? 'Saving...' : 'Register Lead Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
