'use client';

import { useEffect, useState, use } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, Send, Building2, User, Phone, Mail } from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  location: string;
  type: string;
  description?: string;
}

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
}

const TIME_SLOTS = [
  '09:00 AM',
  '10:30 AM',
  '12:00 PM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
];

export default function PublicSiteVisitBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const unwrappedParams = use(params);
  const slug = unwrappedParams.slug;

  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    projectId: '',
    visitDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    visitTime: '10:30 AM',
    remarks: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/api/public/book-visit/${slug}`);
        const data = await res.json();
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setOrg(data.data.org);
        setProjects(data.data.projects || []);
        if (data.data.projects?.length > 0) {
          setForm((prev) => ({ ...prev, projectId: data.data.projects[0]._id }));
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/book-visit/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Booking failed');
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4 text-red-400">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Booking Link Unavailable</h1>
          <p className="text-[#94a3b8]">This company portal is inactive or invalid.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="text-center max-w-md animate-fade-in card p-8 border border-slate-700 bg-slate-900/90 text-white rounded-3xl shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 text-emerald-400">
            <CheckCircle size={36} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Site Visit Confirmed!</h1>
          <p className="text-slate-400 text-sm mb-6">
            Thank you, <strong className="text-white">{form.name}</strong>. Your site visit with{' '}
            <strong className="text-indigo-400">{org?.name}</strong> has been scheduled for{' '}
            <strong className="text-white">{form.visitDate}</strong> at{' '}
            <strong className="text-white">{form.visitTime}</strong>.
          </p>
          <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-slate-300 text-left space-y-2 mb-6">
            <p className="font-bold text-indigo-400">⚡ What happens next?</p>
            <p>1. Our sales manager will contact you to confirm transportation & site entry pass.</p>
            <p>2. A confirmation email has been dispatched to your inbox.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center p-4 py-12">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl animate-fade-in relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">{org?.name}</h1>
          <p className="text-[#94a3b8] mt-2 text-sm">Schedule a Property Site Visit at Your Preferred Time</p>
        </div>

        <div className="card p-8 border border-[#334155] bg-slate-900/90 backdrop-blur-xl shadow-2xl rounded-3xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Selection */}
            {projects.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#cbd5e1] mb-2 flex items-center gap-2">
                  <MapPin size={14} className="text-indigo-400" /> Select Preferred Property / Project
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projects.map((p) => (
                    <div
                      key={p._id}
                      onClick={() => setForm({ ...form, projectId: p._id })}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        form.projectId === p._id
                          ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md'
                          : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <h4 className="font-bold text-sm text-white">{p.name}</h4>
                      <p className="text-xs text-slate-400 mt-1">{p.location} · {p.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Date & Time Slot Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#cbd5e1] mb-2 flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-400" /> Preferred Visit Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={form.visitDate}
                  onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#cbd5e1] mb-2 flex items-center gap-2">
                  <Clock size={14} className="text-indigo-400" /> Time Slot <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.visitTime}
                  onChange={(e) => setForm({ ...form, visitTime: e.target.value })}
                  className="input-field"
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Client Personal Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#cbd5e1] mb-1.5 flex items-center gap-1.5">
                  <User size={13} /> Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#cbd5e1] mb-1.5 flex items-center gap-1.5">
                  <Phone size={13} /> Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#cbd5e1] mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} /> Email Address
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#cbd5e1] mb-1.5">
                  Special Notes / Budget Requirements
                </label>
                <input
                  type="text"
                  placeholder="e.g. Need 3BHK flat, budget 1.2Cr"
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full h-13 text-base shadow-xl shadow-indigo-500/20"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {submitting ? 'Booking Site Visit...' : 'Confirm Site Visit Booking'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#475569] mt-6">
          Powered by R-Life CRM · Instant Automated Pipeline Movement
        </p>
      </div>
    </div>
  );
}
