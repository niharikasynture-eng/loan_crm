'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, BarChart2, Users, TrendingUp, CheckSquare, ChevronDown, Check, Building2, KeyRound, X, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api-client';

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin', desc: 'Full platform control', color: '#7c3aed' },
  { value: 'org_admin', label: 'Org Admin', desc: 'Manage your organization', color: '#1a73e8' },
  { value: 'manager', label: 'Manager', desc: 'Team & pipeline oversight', color: '#0f9d58' },
  { value: 'operator', label: 'Loan Operator', desc: 'Loan stage & docs execution', color: '#2563eb' },
  { value: 'sales_agent', label: 'Sales Person', desc: 'Leads & deals access', color: '#f29900' },
  { value: 'onsite_visitor', label: 'Onsite Visitor', desc: 'Assigned leads view only', color: '#0ea5e9' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('org_admin');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Forgot password modal state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, selectedRole);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotSubmitting(true);

    try {
      const res = await api.post<{ message?: string }>('/auth/forgot-password', { email: forgotEmail });
      setForgotSuccess(res?.message || 'If an account exists for this email address, a password reset link has been sent.');
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Failed to send reset link.');
    } finally {
      setForgotSubmitting(false);
    }
  }

  const activeRole = ROLE_OPTIONS.find(r => r.value === selectedRole)!;

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', fontFamily: "'Inter', sans-serif", background: '#ffffff' }} className="flex-col sm:flex-row">

      {/* ── LEFT PANEL — Login Form ── */}
      <div
        className="w-full sm:w-[420px] sm:flex-shrink-0"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: '36px 44px 24px',
          background: '#ffffff',
          boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
          position: 'relative',
          zIndex: 1,
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="/dealbyte.svg" alt="DealByte Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#1a202c', letterSpacing: '-0.5px' }}>
            DealByte
          </span>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a202c', marginBottom: 4 }}>
          Welcome Back
        </h1>
        <p style={{ fontSize: 13, color: '#718096', marginBottom: 16 }}>
          Enter your email and password to access your account.
        </p>

        {/* Role Selector Dropdown */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Login As
          </p>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Trigger Button */}
            <button
              type="button"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 8,
                border: `2px solid ${activeRole.color}`,
                background: `${activeRole.color}10`,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: activeRole.color, flexShrink: 0,
                }} />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: activeRole.color }}>
                    {activeRole.label}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: '#a0aec0', marginTop: 1 }}>
                    {activeRole.desc}
                  </span>
                </div>
              </div>
              <ChevronDown
                size={16}
                color={activeRole.color}
                style={{ transform: roleDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </button>

            {/* Dropdown List */}
            {roleDropdownOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: '#fff', borderRadius: 10,
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                zIndex: 50, overflow: 'hidden',
              }}>
                {ROLE_OPTIONS.map(role => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => { setSelectedRole(role.value); setRoleDropdownOpen(false); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: selectedRole === role.value ? `${role.color}0d` : 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #f7fafc',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = `${role.color}12`)}
                    onMouseLeave={e => (e.currentTarget.style.background = selectedRole === role.value ? `${role.color}0d` : 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: role.color, flexShrink: 0,
                      }} />
                      <div>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: selectedRole === role.value ? role.color : '#4a5568' }}>
                          {role.label}
                        </span>
                        <span style={{ display: 'block', fontSize: 11, color: '#a0aec0' }}>
                          {role.desc}
                        </span>
                      </div>
                    </div>
                    {selectedRole === role.value && <Check size={14} color={role.color} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }}>
                <Users size={15} />
              </span>
              <input
                id="login-email"
                type="email"
                className="input-field"
                style={{ paddingLeft: 36 }}
                placeholder="name@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568' }}>Password</label>
              <button
                type="button"
                onClick={() => {
                  setForgotError('');
                  setForgotSuccess('');
                  setForgotEmail(email);
                  setIsForgotOpen(true);
                }}
                style={{ fontSize: 12, color: '#1a73e8', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ paddingRight: 40 }}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="remember" style={{ accentColor: '#1a73e8', cursor: 'pointer' }} />
            <label htmlFor="remember" style={{ fontSize: 13, color: '#718096', cursor: 'pointer' }}>Remember me</label>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: '#fce8e6', border: '1px solid rgba(217,48,37,0.3)',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#d93025',
              display: 'flex', alignItems: 'center', gap: 8,
            }} className="animate-shake">
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#d93025', flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            className="btn-primary"
            disabled={isLoading}
            style={{ marginTop: 4, padding: '12px', fontSize: 15, borderRadius: 8, justifyContent: 'center' }}
          >
            {isLoading ? (
              <>
                <div style={{
                  width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
                Signing in...
              </>
            ) : 'Log In'}
          </button>
        </form>

        <p style={{ marginTop: 16, fontSize: 13, color: '#718096', textAlign: 'center' }}>
          New to DealByte?{' '}
          <Link href="/register" style={{ color: '#1a73e8', fontWeight: 600, textDecoration: 'none' }}>
            Create an organization
          </Link>
        </p>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 20 }}>
          <a href="#" style={{ fontSize: 12, color: '#a0aec0', textDecoration: 'none' }}>Privacy Policy</a>
          <span style={{ color: '#e2e8f0' }}>•</span>
          <a href="#" style={{ fontSize: 12, color: '#a0aec0', textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </div>

      {/* ── RIGHT PANEL — Branding (hidden on mobile) ── */}
      <div
        className="hidden sm:flex"
        style={{
          flex: 1,
          background: 'linear-gradient(135deg, #1a73e8 0%, #1557b0 50%, #0d3f8f 100%)',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '52px 60px',
          position: 'relative',
          overflow: 'hidden',
        }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 320, height: 320, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <div style={{
          position: 'absolute', bottom: -120, left: -60,
          width: 400, height: 400, borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 18 }}>
            Effortlessly manage<br />your team and<br />operations.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, maxWidth: 380, marginBottom: 48 }}>
            Log in to access your CRM dashboard and manage your team from one central platform.
          </p>

          {/* Feature Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: <Users size={18} />, text: 'Manage leads and customers in one place' },
              { icon: <TrendingUp size={18} />, text: 'Track your pipeline and close more deals' },
              { icon: <CheckSquare size={18} />, text: 'Assign tasks and monitor team performance' },
              { icon: <BarChart2 size={18} />, text: 'Get real-time reports and analytics' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {/* Mock Dashboard Preview */}
          <div style={{
            marginTop: 48,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '20px 24px',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {['Total Leads', 'Active Deals', 'Revenue'].map((label, i) => (
                <div key={i} style={{
                  flex: 1, background: 'rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '10px 12px',
                }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{label}</div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 4, width: ['80%', '60%', '45%'][i] }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[60, 85, 45, 70, 90, 55, 75].map((h, i) => (
                <div key={i} style={{
                  flex: 1, background: 'rgba(255,255,255,0.2)', borderRadius: 4,
                  height: h * 0.6, alignSelf: 'flex-end',
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL ── */}
      {isForgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-scale-in">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <KeyRound size={18} />
                </div>
                <h2 className="text-sm font-bold text-slate-900">Reset Account Password</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleForgotSubmit} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Enter your registered account email below. We will send you a secure link to reset your password.
              </p>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Account Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {forgotSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-start gap-2 animate-fade-in">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {forgotError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-start gap-2 animate-fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                  <span>{forgotError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5 transition-all"
                >
                  {forgotSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
