'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Activity, Send, CheckCircle } from 'lucide-react';

interface OrgInfo {
  name: string;
  slug: string;
  leadSources: string[];
}

export default function PublicLeadFormPage() {
  const params = useParams();
  const formToken = params.formToken as string;

  const [org, setOrg] = useState<OrgInfo | null>(null);
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
    source: '',
    message: '',
  });

  useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch(`/api/public/lead/${formToken}`);
        const data = await res.json();
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setOrg(data.data.org);
        setForm((prev) => ({ ...prev, source: data.data.org.leadSources[0] || 'Website' }));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    loadOrg();
  }, [formToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/lead/${formToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
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
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <Activity className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Form Not Found</h1>
          <p className="text-[#94a3b8]">This lead capture link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Thank You!</h1>
          <p className="text-[#94a3b8] text-sm">
            Your inquiry has been submitted to <strong className="text-white">{org?.name}</strong>.
            <br />
            Someone from the team will get back to you soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center mb-4">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{org?.name}</h1>
          <p className="text-[#94a3b8] mt-1 text-sm">Fill in your details and we'll be in touch</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  id="lead-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Company</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Acme Corp"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  id="lead-company"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  id="lead-email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="input-field"
                  placeholder="+1 234 567 8900"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  id="lead-phone"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">
                How did you hear about us?
              </label>
              <select
                className="input-field"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                id="lead-source"
              >
                {org?.leadSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Message</label>
              <textarea
                className="input-field resize-none"
                rows={4}
                placeholder="Tell us how we can help you..."
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                id="lead-message"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={submitting}
              id="lead-submit"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {submitting ? 'Submitting...' : 'Submit Inquiry'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#475569] mt-6">
          Powered by DealByte CRM · Your information is kept private and secure
        </p>
      </div>
    </div>
  );
}
