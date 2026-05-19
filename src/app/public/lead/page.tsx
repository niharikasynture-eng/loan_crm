'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Activity, Send, CheckCircle2, AlertCircle } from 'lucide-react';

function LeadFormContent() {
  const searchParams = useSearchParams();
  const orgSlug = searchParams.get('org');
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  if (!orgSlug) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto mt-20">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Invalid Request</h2>
        <p className="text-[#94a3b8]">This link is missing organization details. Please contact the company providing this form.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/public/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, orgSlug }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');

      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="card p-12 text-center max-w-lg mx-auto mt-20 animate-fade-in shadow-2xl shadow-emerald-500/10 border-emerald-500/20">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Thank You!</h2>
        <p className="text-[#94a3b8]">Your message has been received. Our team will get back to you shortly.</p>
        <button 
          onClick={() => {
            setForm({ name: '', email: '', phone: '', company: '', message: '' });
            setStatus('idle');
          }}
          className="btn-secondary mt-8"
        >
          Submit another response
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      {/* Visual background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-xl relative animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/20">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Express Your Interest</h1>
          <p className="text-[#94a3b8] mt-2 italic capitalize">For {orgSlug.replace(/-/g, ' ')}</p>
        </div>

        <div className="card p-8 border-indigo-500/20 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Name *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Company</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Your organization"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Email address *</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Phone number</label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cbd5e1] mb-2">Message / Special Requirements</label>
              <textarea
                className="input-field min-h-[120px] py-3 resize-none"
                placeholder="How can we help you?"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            {status === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 text-red-400 text-sm animate-shake">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3.5 text-base font-semibold shadow-lg shadow-indigo-500/25"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : <Send className="w-5 h-5" />}
              {status === 'loading' ? 'Submitting...' : 'Send Interest'}
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-[#334155] text-center">
            <p className="text-xs text-[#64748b]">Powered by R-Life CRM SaaS • Secure & Isolated</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadCapturePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-[#94a3b8]">Loading form...</div>}>
      <LeadFormContent />
    </Suspense>
  );
}
