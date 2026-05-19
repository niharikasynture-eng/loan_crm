'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import {
  User, Mail, Phone, Shield,
  Copy, Check, Smartphone, Camera
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

/* ---------- Small UI Primitives ---------- */

const Field = ({ label, icon: Icon, children }: any) => (
  <div className="space-y-2.5">
    <label className="text-[12px] font-bold text-slate-500 uppercase tracking-widest ml-1">
      {label}
    </label>
    <div className="relative group">
      {children}
      <Icon
        size={18}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500"
      />
    </div>
  </div>
);

const Input = (props: any) => (
  <input
    {...props}
    className="w-full h-13 rounded-2xl border border-slate-200 bg-white px-5 pr-12
    text-[14px] font-medium text-slate-700 outline-none transition-all
    focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 shadow-sm placeholder:text-slate-300"
  />
);

/* ---------- Page ---------- */

export default function SettingsPage() {
  const { user, refreshUser, isAdmin } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
    }
  }, [user]);

  const syncUrl = useMemo(() => {
    if (!user?.callSyncToken) return '';
    return `${window.location.origin}/api/activities/sync-call-log?token=${user.callSyncToken}`;
  }, [user]);

  if (!user) return null;

  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}`, { name, email, phone });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in space-y-10 pb-20">
      <PageHeader
        title="Settings"
        subtitle="Manage your profile and device sync settings"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-8">
          <div className="card p-12 rounded-3xl border border-slate-100 bg-white shadow-sm flex flex-col items-center text-center">
            <div className="relative mb-8">
              <div className="w-24 h-24 rounded-3xl bg-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-xl shadow-indigo-100">
                {initials}
              </div>
              <button className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-md flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors">
                <Camera size={18} />
              </button>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{user.name}</h2>
            <p className="text-sm font-medium text-slate-400 mt-2 mb-8">{user.email}</p>

            <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border
              ${isAdmin
                ? 'bg-rose-50 text-rose-500 border-rose-100 shadow-sm shadow-rose-50'
                : 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-sm shadow-indigo-50'
              }`}>
              {user.role.replace('_', ' ')}
            </div>
          </div>

          {/* Android Sync Card */}
          {syncUrl && (
            <div className="card p-12 rounded-3xl border border-indigo-50 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm space-y-8">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100/50">
                  <Smartphone size={28} />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-800">
                    Call Sync
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    Android field sync active
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="w-full h-12 flex items-center px-4 rounded-xl border border-slate-100 bg-white/80 text-[11px] font-mono text-slate-400 overflow-hidden shadow-inner">
                  <span className="truncate">{syncUrl}</span>
                </div>
                <button
                  onClick={copyUrl}
                  className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
                >
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                  {copied ? 'Copied' : 'Copy Sync URL'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Personal Information */}
        <div className="lg:col-span-2">
          <div className="card p-12 rounded-3xl border border-slate-100 bg-white shadow-sm space-y-12">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Personal Information</h2>
              <p className="text-sm font-medium text-slate-400 mt-1">Update your account details and contact info</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-10">
              <Field label="Full Name" icon={User}>
                <Input value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Enter your full name" />
              </Field>

              <Field label="Email Address" icon={Mail}>
                <Input type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="name@example.com" />
              </Field>

              <Field label="Phone Number" icon={Phone}>
                <Input value={phone} onChange={(e: any) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </Field>

              <Field label="System Access" icon={Shield}>
                <Input value={user.role.toUpperCase()} readOnly className="bg-slate-50 text-slate-400 border-dashed cursor-not-allowed font-bold" />
              </Field>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                onClick={saveProfile}
                disabled={saving}
                className="h-13 px-12 rounded-2xl bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? 'Saving...' : saved ? '✓ Changes Saved' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Android Sync Card */}
      {syncUrl && (
        <div className="card" style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #f0eeff 0%, #fff 100%)' }}>
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--brand-soft)' }}
            >
              <Smartphone size={16} style={{ color: 'var(--brand)' }} />
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Android Call Sync
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Connect MacroDroid to stream call logs in real-time
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div
              className="flex-1 flex items-center px-3 rounded-lg border overflow-hidden"
              style={{ height: '38px', background: '#fff', borderColor: 'var(--border)', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}
            >
              <span className="truncate">{syncUrl}</span>
            </div>
            <button
              onClick={copyUrl}
              className="btn-secondary"
              style={{ height: '38px', minWidth: '38px', padding: '0 12px' }}
            >
              {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}