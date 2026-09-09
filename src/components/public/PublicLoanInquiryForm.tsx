'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Landmark, ShieldCheck, CheckCircle2, Phone, User,
  MapPin, IndianRupee, Briefcase, ArrowRight, Sparkles,
  Clock, Award, HelpCircle, FileText
} from 'lucide-react';

interface OrgInfo {
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  leadSources?: string[];
}

const LOAN_CATEGORIES = [
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
  'Other Loan Category',
];

const QUICK_AMOUNTS = [
  { label: '₹5 Lakhs', val: 500000 },
  { label: '₹15 Lakhs', val: 1500000 },
  { label: '₹25 Lakhs', val: 2500000 },
  { label: '₹50 Lakhs', val: 5000000 },
  { label: '₹1 Crore', val: 10000000 },
];

export default function PublicLoanInquiryForm({ initialSlug }: { initialSlug: string }) {
  const searchParams = useSearchParams();
  const rawSource = searchParams.get('source') || searchParams.get('utm_source') || 'Instagram Campaign';
  const campaign = searchParams.get('campaign') || searchParams.get('utm_campaign') || '';

  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    industry: 'Home Loan / Housing Loan',
    value: '',
    notes: '',
  });

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch(`/api/public/form/${initialSlug}`);
        const data = await res.json();
        if (!res.ok || !data.data?.org) {
          setNotFound(true);
          return;
        }
        setOrg(data.data.org);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadOrg();
  }, [initialSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!form.phone.trim()) {
      setError('Please enter your active mobile number.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        industry: form.industry,
        value: form.value ? parseFloat(form.value) : 0,
        notes: form.notes.trim() || undefined,
        source: rawSource,
        campaign: campaign || undefined,
      };

      const res = await fetch(`/api/public/form/${initialSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit loan inquiry.');
      }

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading Loan Portal...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HelpCircle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Loan Portal Unavailable</h2>
          <p className="text-xs font-medium text-slate-500 leading-relaxed">
            This loan inquiry link appears to be invalid or has expired. Please verify the URL or contact customer care.
          </p>
        </div>
      </div>
    );
  }

  const isInstagram = rawSource.toLowerCase().includes('insta');

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-slate-50 to-white text-slate-800 font-sans antialiased py-6 sm:py-12 px-4 sm:px-6">
      <div className="max-w-xl mx-auto">

        {/* Top Branding & Social Tag */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100/80 text-indigo-700 text-xs font-bold mb-3 shadow-xs">
            <ShieldCheck size={14} className="text-indigo-600" />
            <span>{org?.name || 'Verified Lending Partner'} • Official Channel</span>
          </div>

          {isInstagram && (
            <div className="mb-2">
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-md bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-xs">
                ✨ Special Instagram Offer Active
              </span>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
            Fast Loan Inquiry & Approval
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 max-w-md mx-auto">
            Get instant eligibility check, lowest bank interest rates, and end-to-end documentation assistance.
          </p>

          {/* Quick Value Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
              <Clock size={12} className="text-emerald-500" /> 30-Min Callback
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
              <Award size={12} className="text-indigo-500" /> Lowest Interest
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
              <ShieldCheck size={12} className="text-blue-500" /> Zero Hidden Charges
            </span>
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xl shadow-indigo-950/5 p-6 sm:p-8 relative overflow-hidden">

          {/* Decorative Corner Accents */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          {submitted ? (
            /* ── SUCCESS STATE ── */
            <div className="py-8 text-center animate-fade-in space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-100 scale-105">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900">Application Received!</h3>
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  Thank you, <span className="font-bold text-slate-800">{form.name}</span>! Your loan inquiry has been registered.
                </p>
              </div>

              {/* Inquiry Summary Box */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2.5 max-w-sm mx-auto my-4 text-xs font-medium">
                <div className="flex justify-between items-center text-slate-500 border-b border-slate-200/60 pb-2">
                  <span>Loan Category</span>
                  <span className="font-bold text-indigo-700">{form.industry}</span>
                </div>
                {form.value && (
                  <div className="flex justify-between items-center text-slate-500 border-b border-slate-200/60 pb-2">
                    <span>Desired Amount</span>
                    <span className="font-bold text-emerald-700">₹{parseFloat(form.value).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-500">
                  <span>Contact Registered</span>
                  <span className="font-bold text-slate-800">{form.phone}</span>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[11px] font-bold text-emerald-800 max-w-sm mx-auto">
                📞 Our Loan Processing Officer is reviewing your file and will contact you shortly to guide your document submission.
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    setForm({
                      name: '',
                      phone: '',
                      email: '',
                      address: '',
                      industry: 'Home Loan / Housing Loan',
                      value: '',
                      notes: '',
                    });
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Submit Another Loan Inquiry
                </button>
              </div>
            </div>
          ) : (
            /* ── FORM ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              {/* 1. Full Name */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Enter your complete name"
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/10 transition-all h-12"
                  />
                </div>
              </div>

              {/* 2. Mobile Contact Number */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                  Mobile / WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Phone size={16} />
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/10 transition-all h-12"
                  />
                </div>
              </div>

              {/* 3. City / Address */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                  Current City / Address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <MapPin size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Baner, Pune"
                    value={form.address}
                    onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))}
                    className="w-full text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/10 transition-all h-12"
                  />
                </div>
              </div>

              {/* 4. What Loan Do You Want? */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                  What Loan Do You Want? <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Briefcase size={16} />
                  </span>
                  <select
                    value={form.industry}
                    onChange={(e) => setForm(p => ({ ...p, industry: e.target.value }))}
                    className="w-full text-sm font-bold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-8 py-3 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/10 transition-all h-12 appearance-none cursor-pointer"
                  >
                    {LOAN_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
              </div>

              {/* 5. Required Loan Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5 ml-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600">
                    Required Loan Amount (₹)
                  </label>
                  {form.value && (
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      ₹{parseFloat(form.value || '0').toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <IndianRupee size={16} />
                  </span>
                  <input
                    type="number"
                    min="10000"
                    placeholder="e.g. 2500000"
                    value={form.value}
                    onChange={(e) => setForm(p => ({ ...p, value: e.target.value }))}
                    className="w-full text-sm font-semibold text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/10 transition-all h-12"
                  />
                </div>

                {/* Quick Selection Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_AMOUNTS.map(item => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, value: item.val.toString() }))}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        form.value === item.val.toString()
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional: Notes / Requirements */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 ml-1">
                  Additional Notes / Questions (Optional)
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    placeholder="e.g. Salaried in IT firm, need loan sanction within 7 days"
                    value={form.notes}
                    onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full text-xs font-medium text-slate-900 bg-slate-50/70 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/10 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-13 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white rounded-2xl font-black text-sm tracking-wide shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Submitting Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Apply For Loan Now</span>
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </div>

              {/* Guarantee text */}
              <p className="text-center text-[11px] font-medium text-slate-400 mt-2">
                🔒 Your personal data is 100% confidential and secure. No spam guaranteed.
              </p>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-xs font-semibold text-slate-400">
            Powered by {org?.name || 'Sales CRM'} • Loan Operations Suite
          </p>
          {org?.phone && (
            <p className="text-xs font-bold text-indigo-600">
              Helpline: <a href={`tel:${org.phone}`} className="hover:underline">{org.phone}</a>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
