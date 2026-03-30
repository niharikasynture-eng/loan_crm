'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import {
  User as UserIcon, Building2, CreditCard, Bell,
  Copy, Check, ExternalLink, Loader2, Link2,
  Shield, Mail, Phone, Globe, CheckCircle,
} from 'lucide-react';

const TABS = [
  { id: 'profile',       label: 'My Profile',     icon: UserIcon,   roles: ['all'] },
  { id: 'organization',  label: 'Organization',    icon: Building2,  roles: ['org_admin', 'super_admin'] },
  { id: 'leadform',      label: 'Lead Form URL',   icon: Link2,      roles: ['org_admin', 'manager', 'super_admin'] },
  { id: 'notifications', label: 'Notifications',   icon: Bell,       roles: ['all'] },
  { id: 'billing',       label: 'Billing',         icon: CreditCard, roles: ['org_admin', 'super_admin'] },
];

export default function SettingsPage() {
  const { user, organization, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [copied, setCopied]       = useState(false);
  const [saved, setSaved]         = useState(false);

  // Profile state
  const [name, setName]   = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) { setName(user.name); setPhone(user.phone || ''); }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await api.patch(`/users/${user.id}`, { name, phone });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const publicLeadUrl = typeof window !== 'undefined' && organization?.slug
    ? `${window.location.origin}/public/${organization.slug}`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicLeadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) return null;

  const visibleTabs = TABS.filter(t =>
    t.roles.includes('all') || t.roles.includes(user.role)
  );

  const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
    super_admin: { label: 'Super Admin',  color: '#7c3aed', bg: '#f3f0ff' },
    org_admin:   { label: 'Org Admin',    color: '#1a73e8', bg: '#e8f0fe' },
    manager:     { label: 'Manager',      color: '#0f9d58', bg: '#e6f4ea' },
    sales_agent: { label: 'Sales Person', color: '#f29900', bg: '#fef7e0' },
  };
  const roleMeta = ROLE_META[user.role] || { label: user.role, color: '#718096', bg: '#f0f4f9' };

  // Reusable styled section header
  function SectionHeader({ title, desc }: { title: string; desc?: string }) {
    return (
      <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f4f9' }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a202c', margin: 0 }}>{title}</h2>
        {desc && <p style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>{desc}</p>}
      </div>
    );
  }

  // Reusable form field
  function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
      <div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>{label}</label>
        {children}
        {hint && <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>{hint}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, display: 'flex', gap: 24, alignItems: 'flex-start' }}>

      {/* ── Sidebar Nav ── */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
          {/* User Info at top of sidebar */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid #f0f4f9', textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: roleMeta.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: roleMeta.color,
              margin: '0 auto 10px',
            }}>
              {user.name.charAt(0)}
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a202c', margin: 0 }}>{user.name}</p>
            <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, fontWeight: 700, color: roleMeta.color, background: roleMeta.bg, padding: '2px 8px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {roleMeta.label}
            </span>
          </div>

          {/* Tab buttons */}
          <div style={{ padding: '8px 8px' }}>
            {visibleTabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  marginBottom: 2, textAlign: 'left', transition: 'all 0.12s',
                  background: active ? '#e8f0fe' : 'transparent',
                  color: active ? '#1a73e8' : '#718096',
                  fontWeight: active ? 700 : 500, fontSize: 13,
                }}>
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content Panel ── */}
      <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '28px 32px' }}>

        {/* ── PROFILE ── */}
        {activeTab === 'profile' && (
          <div>
            <SectionHeader title="Profile Information" desc="Update your personal details and contact info." />

            {/* Avatar row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, padding: '16px 20px', background: '#f7f8fc', borderRadius: 10, border: '1px solid #f0f4f9' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: roleMeta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: roleMeta.color, flexShrink: 0 }}>
                {user.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1a202c', margin: '0 0 2px' }}>{user.name}</p>
                <p style={{ fontSize: 12, color: '#718096', margin: '0 0 10px' }}>{user.email}</p>
                <button className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>Change Avatar</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: roleMeta.bg, padding: '6px 12px', borderRadius: 100 }}>
                <Shield size={13} style={{ color: roleMeta.color }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: roleMeta.color }}>{roleMeta.label}</span>
              </div>
            </div>

            {/* Form grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
              <Field label="Full Name">
                <div style={{ position: 'relative' }}>
                  <UserIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                  <input type="text" className="input-field" style={{ paddingLeft: 34 }} value={name} onChange={e => setName(e.target.value)} />
                </div>
              </Field>

              <Field label="Email Address" hint="Email cannot be changed">
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                  <input type="email" className="input-field" style={{ paddingLeft: 34, background: '#f7f8fc', color: '#a0aec0' }} defaultValue={user.email} disabled />
                </div>
              </Field>

              <Field label="Phone Number" hint="Required for 1-click calling feature">
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                  <input type="text" className="input-field" style={{ paddingLeft: 34 }} placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </Field>

              <Field label="Role" hint="Role is managed by your organization admin">
                <div style={{ position: 'relative' }}>
                  <Shield size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                  <input type="text" className="input-field" style={{ paddingLeft: 34, background: '#f7f8fc', color: '#a0aec0' }} defaultValue={roleMeta.label} disabled />
                </div>
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 16, borderTop: '1px solid #f0f4f9' }}>
              {saved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0f9d58', fontSize: 13, fontWeight: 600 }}>
                  <CheckCircle size={15} /> Saved!
                </div>
              )}
              <button onClick={handleSaveProfile} disabled={isSaving} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isSaving ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : null}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ── ORGANIZATION ── */}
        {activeTab === 'organization' && (
          <div>
            <SectionHeader title="Organization Settings" desc="Manage your organization's details and preferences." />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
              <Field label="Company Name">
                <div style={{ position: 'relative' }}>
                  <Building2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                  <input type="text" className="input-field" style={{ paddingLeft: 34 }} defaultValue={organization?.name} />
                </div>
              </Field>

              <Field label="Unique Slug" hint="Cannot be changed after creation">
                <div style={{ position: 'relative' }}>
                  <Globe size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a0aec0' }} />
                  <input type="text" className="input-field" style={{ paddingLeft: 34, background: '#f7f8fc', color: '#a0aec0' }} defaultValue={organization?.slug} disabled />
                </div>
              </Field>

              <Field label="Timezone">
                <select className="input-field">
                  <option>Asia/Kolkata (IST)</option>
                  <option>UTC</option>
                  <option>America/New_York (EST)</option>
                  <option>America/Los_Angeles (PST)</option>
                  <option>Europe/London (GMT)</option>
                </select>
              </Field>

              <Field label="Currency">
                <select className="input-field">
                  <option>INR (₹)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                </select>
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f0f4f9' }}>
              <button className="btn-primary">Update Organization</button>
            </div>
          </div>
        )}

        {/* ── LEAD FORM URL ── */}
        {activeTab === 'leadform' && (
          <div>
            <SectionHeader title="Public Lead Form URL" desc="Share this link with potential customers to capture leads automatically." />

            {/* URL Card */}
            <div style={{ background: 'linear-gradient(135deg, #e8f0fe, #f0f4ff)', border: '1px solid rgba(26,115,232,0.2)', borderRadius: 12, padding: '24px 28px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Link2 size={18} color="#fff" />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a202c', margin: 0 }}>Your Unique Lead Form Link</p>
                  <p style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>Leads who fill this form appear instantly in your Leads tab</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
                <code style={{ flex: 1, fontSize: 13, color: '#1a73e8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {publicLeadUrl || 'URL not available'}
                </code>
                <button onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: copied ? '#0f9d58' : '#1a73e8', color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'background 0.2s', flexShrink: 0 }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                <a href={publicLeadUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#f0f4f9', color: '#718096', border: '1px solid #e2e8f0', borderRadius: 7, textDecoration: 'none', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  <ExternalLink size={14} /> Preview
                </a>
              </div>
            </div>

            {/* How it works */}
            <div style={{ background: '#f7f8fc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a202c', marginBottom: 14 }}>How it works</p>
              {[
                { step: '1', text: 'Share the link above with potential customers via email, social media or your website' },
                { step: '2', text: 'Leads fill in their name, email, phone and message' },
                { step: '3', text: 'They instantly receive a "Thank you" confirmation email' },
                { step: '4', text: 'Lead appears immediately in your Leads tab, ready to be assigned' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1a73e8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{step}</div>
                  <p style={{ fontSize: 13, color: '#4a5568', margin: 0, lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {activeTab === 'notifications' && (
          <div>
            <SectionHeader title="Notification Preferences" desc="Configure how you receive alerts and updates." />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { title: 'New Lead Assignment',   desc: 'When a new lead is assigned to you', checked: true },
                { title: 'Task Reminders',        desc: 'When a task is due soon or overdue', checked: true },
                { title: 'Deal Stage Changes',    desc: 'When a deal moves in the pipeline',  checked: false },
                { title: 'Daily Digest',          desc: 'Summary of daily activities at 8 AM', checked: false },
                { title: 'New Lead from Form',    desc: 'When someone fills your public lead form', checked: true },
              ].map((pref, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#f7f8fc', border: '1px solid #f0f4f9', borderRadius: 10, transition: 'border-color 0.15s' }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a202c', margin: '0 0 3px' }}>{pref.title}</p>
                    <p style={{ fontSize: 12, color: '#718096', margin: 0 }}>{pref.desc}</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <input type="checkbox" defaultChecked={pref.checked} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                      onChange={e => {
                        const track = e.target.nextElementSibling as HTMLElement;
                        if (track) track.style.background = e.target.checked ? '#1a73e8' : '#e2e8f0';
                      }} />
                    <div style={{ width: 44, height: 24, borderRadius: 100, background: pref.checked ? '#1a73e8' : '#e2e8f0', transition: 'background 0.2s', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 2, left: pref.checked ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                    </div>
                  </label>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn-primary">Save Preferences</button>
            </div>
          </div>
        )}

        {/* ── BILLING ── */}
        {activeTab === 'billing' && (
          <div>
            <SectionHeader title="Subscription & Billing" desc="Manage your plan and payment information." />

            {/* Current Plan */}
            <div style={{ background: 'linear-gradient(135deg, #e8f0fe, #f0f4ff)', border: '1px solid rgba(26,115,232,0.2)', borderRadius: 12, padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1a73e8', marginBottom: 6, display: 'block' }}>Current Plan</span>
                <p style={{ fontSize: 26, fontWeight: 800, color: '#1a202c', margin: '0 0 4px' }}>Starter — Free</p>
                <p style={{ fontSize: 13, color: '#718096', margin: 0 }}>Basic features for small teams · Up to 5 users</p>
              </div>
              <button className="btn-primary" style={{ fontSize: 14 }}>Upgrade Plan →</button>
            </div>

            {/* Feature comparison */}
            <div style={{ background: '#f7f8fc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px 24px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a202c', marginBottom: 14 }}>What's included in Free</p>
              {['Up to 5 team members', 'Public lead capture form', 'Basic pipeline management', 'Activity logging', '1 organization'].map((feat, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <CheckCircle size={15} style={{ color: '#0f9d58', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#4a5568' }}>{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
