'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import {
  User, Mail, Phone, Shield,
  Copy, Check, Smartphone, Camera
} from 'lucide-react';

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
    {children}
  </label>
);

const InputField = (props: any) => (
  <input
    {...props}
    style={{
      width: '100%',
      height: '38px',
      borderRadius: '8px',
      border: '1px solid var(--border-strong)',
      background: props.readOnly ? 'var(--bg-page)' : '#FFFFFF',
      padding: '0 12px',
      fontSize: '13px',
      color: props.readOnly ? 'var(--text-muted)' : 'var(--text-primary)',
      outline: 'none',
      fontFamily: 'inherit',
      transition: 'border-color 0.15s, box-shadow 0.15s',
      ...props.style,
    }}
    onFocus={e => {
      if (!props.readOnly) {
        e.target.style.borderColor = 'var(--brand)';
        e.target.style.boxShadow = '0 0 0 3px rgba(108, 92, 231, 0.12)';
      }
    }}
    onBlur={e => {
      e.target.style.borderColor = 'var(--border-strong)';
      e.target.style.boxShadow = 'none';
    }}
  />
);

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
    <div style={{ maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
          Settings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Manage your personal profile and integration settings
        </p>
      </div>

      {/* Profile Banner */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-base font-semibold text-white"
                style={{ background: 'var(--brand)' }}
              >
                {initials}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border flex items-center justify-center"
                style={{ background: '#fff', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                <Camera size={10} />
              </div>
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.name}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {user.email}
              </p>
            </div>
          </div>

          <span
            className="px-2.5 py-1 rounded-lg"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              background: isAdmin ? '#fef2f2' : 'var(--brand-soft)',
              color: isAdmin ? 'var(--danger)' : 'var(--brand)',
              border: `1px solid ${isAdmin ? 'rgba(239,68,68,0.15)' : 'rgba(108,92,231,0.15)'}`,
            }}
          >
            {user.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Personal Info Card */}
      <div className="card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Personal Information
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <div className="relative">
              <InputField value={name} onChange={(e: any) => setName(e.target.value)} />
              <User size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <FieldLabel>Email Address</FieldLabel>
            <div className="relative">
              <InputField type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} />
              <Mail size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <FieldLabel>Phone Number</FieldLabel>
            <div className="relative">
              <InputField value={phone} onChange={(e: any) => setPhone(e.target.value)} />
              <Phone size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)', pointerEvents: 'none' }} />
            </div>
          </div>

          <div>
            <FieldLabel>Authorization</FieldLabel>
            <div className="relative">
              <InputField value={user.role} readOnly />
              <Shield size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary"
            style={{ minWidth: '120px', fontSize: '13px', padding: '8px 16px' }}
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
          </button>
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