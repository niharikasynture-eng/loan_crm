'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import { Settings, User as UserIcon, Building2, CreditCard, Bell, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, organization, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [copied, setCopied] = useState(false);
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await api.patch(`/users/${user.id}`, { name, phone });
      await refreshUser();
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const publicLeadUrl = typeof window !== 'undefined' && organization?.slug
    ? `${window.location.origin}/form/${organization.slug}`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(publicLeadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stub components for settings UI
  const tabs = [
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'billing', label: 'Billing', icon: CreditCard },
  ];

  if (!user) return null;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          Settings
        </h1>
        <p className="text-[#94a3b8] mt-1 text-sm">Manage your account and organization preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="card p-2">
            {tabs.map((tab) => {
              if ((tab.id === 'organization' || tab.id === 'billing') && user.role !== 'org_admin' && user.role !== 'super_admin') {
                return null;
              }
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-[#94a3b8] hover:bg-[#0f172a] hover:text-[#f1f5f9]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <div className="card p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-lg font-bold text-white border-b border-[#334155] pb-4">Profile Information</h2>
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-[#0f172a] border border-[#334155] flex items-center justify-center text-2xl font-bold text-[#cbd5e1]">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <button className="btn-secondary text-sm">Upload Avatar</button>
                    <p className="text-xs text-[#64748b] mt-2">JPG, GIF or PNG. Max size of 800K</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Full Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Email Address</label>
                    <input type="email" className="input-field" defaultValue={user.email} disabled />
                    <p className="text-[10px] text-[#64748b] mt-1">Email cannot be changed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Phone Number</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="+1234567890" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                    />
                    <p className="text-[10px] text-[#64748b] mt-1">Required for 1-click calling feature</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Role</label>
                    <input type="text" className="input-field" defaultValue={user.role} disabled />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    className="btn-primary flex items-center gap-2" 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'organization' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-lg font-bold text-white border-b border-[#334155] pb-4">Organization Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Company Name</label>
                    <input type="text" className="input-field" defaultValue={organization?.name} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Unique Slug</label>
                    <input type="text" className="input-field" defaultValue={organization?.slug} disabled />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Timezone</label>
                    <select className="input-field">
                      <option>UTC</option>
                      <option>America/New_York</option>
                      <option>America/Los_Angeles</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#cbd5e1] mb-1.5">Currency</label>
                    <select className="input-field">
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                      <option>GBP (£)</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <button className="btn-primary">Update Organization</button>
                </div>

                <div className="mt-10 pt-10 border-t border-[#334155]">
                  <h3 className="text-white font-bold mb-4">Public Lead Capture</h3>
                  <p className="text-sm text-[#94a3b8] mb-6">
                    Share this link with potential customers. Any information they submit through this form 
                    will automatically appear in your **Leads** tab.
                  </p>
                  
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-[#0f172a] border border-[#334155]">
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs text-[#64748b] mb-1">Your Unique Form Link</p>
                      <p className="text-sm text-indigo-400 font-mono truncate">{publicLeadUrl}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={copyToClipboard}
                        className="p-2.5 rounded-lg bg-[#1e293b] text-[#cbd5e1] hover:text-white hover:bg-[#334155] transition-all border border-[#334155]"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a 
                        href={publicLeadUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2.5 rounded-lg bg-[#1e293b] text-[#cbd5e1] hover:text-white hover:bg-[#334155] transition-all border border-[#334155]"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-lg font-bold text-white border-b border-[#334155] pb-4">Subscription & Billing</h2>
                <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1 block">Current Plan</span>
                    <h3 className="text-2xl font-bold text-white">Starter Free</h3>
                    <p className="text-sm text-[#94a3b8] mt-1">Basic features for small teams</p>
                  </div>
                  <button className="btn-primary">Upgrade Plan</button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-fade-in">
                <h2 className="text-lg font-bold text-white border-b border-[#334155] pb-4">Notification Preferences</h2>
                <p className="text-sm text-[#94a3b8]">Configure how you receive alerts and updates.</p>
                
                <div className="space-y-4">
                  {[
                    { title: 'New Lead Assignment', desc: 'When a new lead is assigned to you' },
                    { title: 'Task Reminders', desc: 'When a task is due soon or overdue' },
                    { title: 'Deal Stage Changes', desc: 'When a deal moves in the pipeline' },
                    { title: 'Daily Digest', desc: 'Summary of daily activities at 8 AM' }
                  ].map((pref, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-[#0f172a] border border-[#334155]">
                      <div>
                        <p className="font-medium text-[#cbd5e1]">{pref.title}</p>
                        <p className="text-xs text-[#64748b]">{pref.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" value="" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-[#334155] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
