'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    orgName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: form.orgName,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Application Submitted!</h1>
          <div className="card p-6 text-left">
            <p className="text-[#94a3b8] text-sm mb-4">
              Your organization <strong className="text-white">"{form.orgName}"</strong> registration 
              request has been submitted successfully.
            </p>
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 mb-4">
              <p className="text-indigo-300 text-sm font-medium mb-1">⏳ What happens next?</p>
              <ol className="text-[#94a3b8] text-sm space-y-1.5 list-decimal list-inside">
                <li>Our team will review your application</li>
                <li>
                  You'll receive an email at <strong className="text-white">{form.adminEmail}</strong>
                </li>
                <li>Click the link in the email to set your password</li>
                <li>Login and start using SalesCRM!</li>
              </ol>
            </div>
            <p className="text-[#64748b] text-xs">
              This usually takes a few hours. Check your spam folder if you don't receive the email.
            </p>
          </div>
          <p className="text-center text-sm text-[#64748b] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 flex items-center justify-center mb-4">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Register your organization</h1>
          <p className="text-[#94a3b8] mt-1 text-sm">
            Submit a request to join SalesCRM — approved by our team
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                name="orgName"
                className="input-field"
                placeholder="Acme Corp"
                value={form.orgName}
                onChange={handleChange}
                required
                id="reg-org-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Your Name</label>
              <input
                type="text"
                name="adminName"
                className="input-field"
                placeholder="John Doe"
                value={form.adminName}
                onChange={handleChange}
                required
                id="reg-admin-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Work Email</label>
              <input
                type="email"
                name="adminEmail"
                className="input-field"
                placeholder="john@acme.com"
                value={form.adminEmail}
                onChange={handleChange}
                required
                id="reg-admin-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">
                Temporary Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="adminPassword"
                  className="input-field pr-10"
                  placeholder="Min 8 characters"
                  value={form.adminPassword}
                  onChange={handleChange}
                  required
                  minLength={8}
                  id="reg-admin-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#94a3b8]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-[#64748b]">
                You'll set your real password via the approval email link.
              </p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading}
              id="reg-submit"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isLoading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#64748b] mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
