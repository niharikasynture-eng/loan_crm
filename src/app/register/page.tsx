'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, CheckCircle, BarChart2, Building2, Users, TrendingUp } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ orgName: '', adminName: '', adminEmail: '', adminPassword: '' });
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
        body: JSON.stringify(form),
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

  // ── Success state ──
  if (submitted) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f0f4f9', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }} className="animate-fade-in">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e6f4ea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={32} style={{ color: '#0f9d58' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1a202c', marginBottom: 8 }}>Application Submitted!</h1>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '24px 28px', textAlign: 'left', marginTop: 20 }}>
            <p style={{ fontSize: 14, color: '#718096', marginBottom: 16 }}>
              Your organization <strong style={{ color: '#1a202c' }}>"{form.orgName}"</strong> has been submitted successfully.
            </p>
            <div style={{ background: '#e8f0fe', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a73e8', marginBottom: 8 }}>⏳ What happens next?</p>
              <ol style={{ paddingLeft: 18, color: '#4a5568', fontSize: 13, lineHeight: 1.8, margin: 0 }}>
                <li>Our team will review your application</li>
                <li>You'll receive an email at <strong>{form.adminEmail}</strong></li>
                <li>Click the link to set your password</li>
                <li>Login and start using DealByte!</li>
              </ol>
            </div>
            <p style={{ fontSize: 12, color: '#a0aec0' }}>This usually takes a few hours. Check your spam folder too.</p>
          </div>
          <p style={{ marginTop: 20, fontSize: 13, color: '#718096' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#1a73e8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Main Form ──
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#f0f4f9' }}>

      {/* ── LEFT — Form ── */}
      <div style={{
        flex: '0 0 480px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '48px 52px',
        background: '#ffffff',
        boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="/dealbyte.svg" alt="DealByte Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#1a202c', letterSpacing: '-0.5px' }}>DealByte</span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a202c', marginBottom: 6 }}>Register your organization</h1>
        <p style={{ fontSize: 14, color: '#718096', marginBottom: 28 }}>
          Submit a request to join DealByte — approved by our team.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Org Name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Organization Name *</label>
            <input id="reg-org-name" type="text" name="orgName" className="input-field" placeholder="Acme Corp" value={form.orgName} onChange={handleChange} required />
          </div>

          {/* Admin Name */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Your Name *</label>
            <input id="reg-admin-name" type="text" name="adminName" className="input-field" placeholder="John Doe" value={form.adminName} onChange={handleChange} required />
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Work Email *</label>
            <input id="reg-admin-email" type="email" name="adminEmail" className="input-field" placeholder="john@acme.com" value={form.adminEmail} onChange={handleChange} required />
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Temporary Password *</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-admin-password"
                type={showPassword ? 'text' : 'password'}
                name="adminPassword"
                className="input-field"
                style={{ paddingRight: 40 }}
                placeholder="Min 8 characters"
                value={form.adminPassword}
                onChange={handleChange}
                required
                minLength={8}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p style={{ fontSize: 12, color: '#a0aec0', marginTop: 6 }}>You'll set your real password via the approval email link.</p>
          </div>

          {error && (
            <div style={{ background: '#fce8e6', border: '1px solid rgba(217,48,37,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#d93025' }} className="animate-shake">
              {error}
            </div>
          )}

          <button
            id="reg-submit"
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ padding: '12px', fontSize: 15, borderRadius: 8, justifyContent: 'center', marginTop: 4 }}
          >
            {isLoading ? (
              <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Submitting...</>
            ) : 'Submit Application'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 13, color: '#718096', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#1a73e8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
        </p>
      </div>

      {/* ── RIGHT — Branding ── */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 50%, #0d3f8f 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '52px 60px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -60, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 18 }}>
            Start managing<br />your team & sales<br />in minutes.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 380, marginBottom: 48 }}>
            Register your organization and get access to a full-featured CRM platform built for modern sales teams.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: <Building2 size={18} />, text: 'Create your organization in seconds' },
              { icon: <Users size={18} />, text: 'Invite team members with role-based access' },
              { icon: <TrendingUp size={18} />, text: 'Track leads, deals and your pipeline' },
              { icon: <BarChart2 size={18} />, text: 'Get approved and go live right away' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
