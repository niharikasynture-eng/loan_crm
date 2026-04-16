'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import { User, Mail, Phone, Shield, Copy, Check, Smartphone } from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
    }
  }, [user]);

  if (!user) return null;

  const syncUrl = user.callSyncToken
    ? `${window.location.origin}/api/activities/sync-call-log?token=${user.callSyncToken}`
    : '';

  const saveProfile = async () => {
    setSaving(true);
    await api.patch(`/users/${user.id}`, { name, email, phone });
    await refreshUser();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(syncUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 md:px-10">
      <div className="max-w-3xl mx-auto">

        {/* Page Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Profile Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your personal information and Android call syncing
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

          {/* Avatar Row */}
          <div className="flex items-center gap-4 px-8 pt-8 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-semibold select-none">
              {initials}
            </div>
            <div>
              <p className="text-base font-medium text-slate-900">{name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {user.role} &nbsp;·&nbsp; DealByte CRM
              </p>
            </div>
          </div>

          {/* Section Header */}
          <div className="flex items-center gap-3 px-8 pt-6 pb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <User size={15} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">Personal Information</p>
              <p className="text-xs text-slate-400">Update your name, email and contact details</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 px-8 pb-6">
            <Field label="Full Name" value={name} onChange={setName} />
            <Field label="Email Address" value={email} onChange={setEmail} type="email" />
            <Field label="Phone Number" value={phone} onChange={setPhone} type="tel" />

            {/* Role — non-editable badge */}
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                Access Role
              </label>
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-2.5 rounded-lg w-full">
                <Shield size={14} />
                {user.role}
              </div>
            </div>
          </div>

          {/* Save Row */}
          <div className="flex items-center justify-end gap-3 px-8 py-4 border-t border-slate-100 bg-slate-50/60">
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-sm">
                <Check size={14} />
                Changes saved
              </span>
            )}
            <button
              onClick={saveProfile}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Android Sync Card */}
        {syncUrl && (
          <div className="mt-5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

            <div className="flex items-center gap-3 px-8 pt-6 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Smartphone size={15} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">Android Call Sync</p>
                <p className="text-xs text-slate-400">Auto-sync call logs via MacroDroid webhook</p>
              </div>
            </div>

            <div className="px-8 py-6">
              {/* URL Row */}
              <div className="flex flex-col md:flex-row gap-3 mb-5">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-xs font-mono text-slate-700 break-all leading-relaxed">
                  {syncUrl}
                </div>
                <button
                  onClick={copyUrl}
                  className={`flex items-center gap-2 justify-center px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${copied ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </div>

              {/* Steps Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  'Install MacroDroid from Play Store',
                  'Import the provided sync file',
                  'Paste this webhook URL in MacroDroid',
                  'Calls will sync to CRM automatically',
                ].map((step, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2.5"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-medium flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-xs text-slate-600">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Field Component ---- */
function Field({
  label,
  value,
  onChange,
  disabled = false,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 rounded-lg py-2.5 px-3.5 text-sm text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
      />
    </div>
  );
}