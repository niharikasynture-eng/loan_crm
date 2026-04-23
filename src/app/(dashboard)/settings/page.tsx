'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import {
  User, Mail, Phone, Shield,
  Copy, Check, Smartphone, Camera
} from 'lucide-react';
import { styleText } from 'util';

/* ---------- Small UI Primitives ---------- */

const Field = ({ label, icon: Icon, children }: any) => (
  <div className="space-y-2">
    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
      {label}
    </label>
    <div className="relative">
      {children}
      <Icon
        size={17}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"
      />
    </div>
  </div>
);

const Input = (props: any) => (
  <input
    {...props}
    className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 pr-12
    text-[14px] text-slate-700 outline-none transition
    focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 shadow-sm"
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

  const initials =
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const saveProfile = async () => {
    setSaving(true);
    await api.patch(`/users/${user.id}`, { name, email, phone });
    await refreshUser();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#f6f8fc] min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ---------- Profile Banner ---------- */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl font-semibold">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border flex items-center justify-center text-slate-400">
                <Camera size={12} />
              </div>
            </div>
            <div>
              <p className="text-[17px] font-semibold text-slate-800">{user.name}</p>
              <p className="text-[13px] text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-lg text-[11px] font-semibold border
            ${isAdmin
              ? 'bg-red-50 text-red-500 border-red-100'
              : 'bg-indigo-50 text-indigo-600 border-indigo-100'
            }`}>
            {user.role.replace('_', ' ')}
          </div>
        </div>

        {/* ---------- Personal Info Card ---------- */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-800 mb-6">
            Personal Information
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Full Name" icon={User}>
              <Input value={name} onChange={(e: any) => setName(e.target.value)} />
            </Field>

            <Field label="Email Address" icon={Mail}>
              <Input type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
            </Field>

            <Field label="Phone Number" icon={Phone}>
              <Input value={phone} onChange={(e: any) => setPhone(e.target.value)} />
            </Field>

            <Field label="Authorization" icon={Shield}>
              <Input value={user.role} readOnly className="bg-slate-50 text-slate-500" />
            </Field>
          </div>
        </div>

        {/* ---------- Android Sync Card ---------- */}
        {syncUrl && (
          <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <Smartphone size={20} className="text-indigo-600" />
              <div>
                <p className="text-[15px] font-semibold text-slate-800">
                  Android Call Sync
                </p>
                <p className="text-[12px] text-slate-500">
                  Connect MacroDroid to stream call logs in real-time
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 h-12 flex items-center px-4 rounded-xl border bg-white text-[12px] font-mono text-slate-500 overflow-hidden">
                <span className="truncate">{syncUrl}</span>
              </div>
              <button
                onClick={copyUrl}
                className="h-12 px-4 rounded-xl border bg-white hover:bg-indigo-50 transition"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* ---------- Sticky Save Footer ---------- */}
        <div className="sticky bottom-6 flex justify-end mt-16">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="h-12 px-10 rounded-xl bg-indigo-600 border border-indigo-600 text-[#ffffff] shadow-lg hover:bg-indigo-700 transition active:scale-[0.98]"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}