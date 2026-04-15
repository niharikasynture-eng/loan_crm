'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api-client';
import {
  User as UserIcon, Building2, CreditCard, Bell,
  Copy, Check, ExternalLink, Loader2, Link2,
  Shield, Mail, Phone, Globe, CheckCircle, RotateCcw,
} from 'lucide-react';

const TABS = [
  { id: 'profile',       label: 'My Profile',     icon: UserIcon,   roles: ['all'] },
  { id: 'organization',  label: 'Organization',    icon: Building2,  roles: ['org_admin', 'super_admin'] },
  { id: 'leadform',      label: 'Lead Form URL',   icon: Link2,      roles: ['org_admin', 'manager', 'super_admin'] },
  { id: 'notifications', label: 'Notifications',   icon: Bell,       roles: ['all'] },
  { id: 'billing',       label: 'Billing',         icon: CreditCard, roles: ['org_admin', 'super_admin'] },
];

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  super_admin: { label: 'Super Admin',  color: '#7c3aed', bg: '#f5f3ff' },
  org_admin:   { label: 'Org Admin',    color: '#1a73e8', bg: '#eff6ff' },
  manager:     { label: 'Manager',      color: '#059669', bg: '#ecfdf5' },
  sales_agent: { label: 'Sales Person', color: '#d97706', bg: '#fffbeb' },
  onsite_visitor: { label: 'Onsite Visitor', color: '#0284c7', bg: '#f0f9ff' },
};

export default function SettingsPage() {
  const { user, organization, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [copied, setCopied]       = useState(false);
  const [saved, setSaved]         = useState(false);

  // Profile state
  const [name, setName]   = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [syncCopied, setSyncCopied] = useState(false);

  useEffect(() => {
    if (user) { 
      setName(user.name); 
      setEmail(user.email);
      setPhone(user.phone || ''); 
    }
  }, [user]);

  const handleGenerateSyncToken = async () => {
    if (!user) return;
    setIsSaving(true);
    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      await api.patch(`/users/${user.id}`, { callSyncToken: newToken });
      await refreshUser();
    } catch {
      alert('Failed to generate sync token');
    } finally {
      setIsSaving(false);
    }
  };

  const syncUrl = typeof window !== 'undefined' && user?.callSyncToken
    ? `${window.location.origin}/api/activities/sync-call-log?token=${user.callSyncToken}`
    : '';

  const copySyncToClipboard = () => {
    if (!syncUrl) return;
    navigator.clipboard.writeText(syncUrl);
    setSyncCopied(true);
    setTimeout(() => setSyncCopied(false), 2000);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await api.patch(`/users/${user.id}`, { name, email, phone });
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

  const visibleTabs = TABS.filter(t => t.roles.includes('all') || t.roles.includes(user.role));
  const roleMeta = ROLE_META[user.role] || { label: user.role, color: '#64748b', bg: '#f8fafc' };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-0 mb-32">

      <div className="flex flex-col md:flex-row gap-12 items-start">

        {/* ── SIDEBAR ── */}
        <aside className="w-full md:w-64 md:flex-shrink-0">
          <div className="bg-white border border-slate-200/60 rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-8 pb-6 text-center">
              <div
                className="w-20 h-20 rounded-[28px] flex items-center justify-center text-3xl font-semibold mx-auto mb-4 shadow-sm"
                style={{ background: roleMeta.bg, color: roleMeta.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-semibold text-slate-800 tracking-tight">{user.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{roleMeta.label}</p>
            </div>
            <nav className="p-4 flex md:flex-col overflow-x-auto gap-1 no-scrollbar border-t border-slate-50">
              {visibleTabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[14px] font-medium transition-all w-full text-left ${
                      active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── CONTENT ── */}
        <main className="flex-1 min-w-0 bg-white border border-slate-100 rounded-[40px] shadow-sm">
          <div className="p-8 md:p-14">
            
            {activeTab === 'profile' && (
              <div className="space-y-12">
                <header>
                  <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Profile Information</h2>
                  <p className="text-slate-400 mt-2 font-medium">Update your account identity and contact details.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                  {/* Name */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative group">
                       <UserIcon size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-blue-500 transition-colors z-10" />
                       <input 
                         type="text" 
                         value={name} 
                         onChange={e => setName(e.target.value)}
                         style={{ paddingLeft: '64px' }} // GUARANTEED Padding
                         className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4.5 pr-6 text-slate-700 font-medium focus:bg-white focus:border-blue-300 transition-all outline-none h-14"
                       />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative group">
                       <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-blue-500 transition-colors z-10" />
                       <input 
                         type="email" 
                         value={email} 
                         onChange={e => setEmail(e.target.value)}
                         style={{ paddingLeft: '64px' }} // GUARANTEED Padding
                         className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4.5 pr-6 text-slate-700 font-medium focus:bg-white focus:border-blue-300 transition-all outline-none h-14"
                       />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                    <div className="relative group">
                       <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-blue-500 transition-colors z-10" />
                       <input 
                         type="text" 
                         value={phone} 
                         onChange={e => setPhone(e.target.value)}
                         style={{ paddingLeft: '64px' }} // GUARANTEED Padding
                         className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4.5 pr-6 text-slate-700 font-medium focus:bg-white focus:border-blue-300 transition-all outline-none h-14"
                       />
                    </div>
                  </div>

                  {/* Role */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-widest ml-1">Access Role</label>
                    <div className="relative">
                       <Shield size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-200 pointer-events-none z-10" />
                       <input 
                         type="text" 
                         value={roleMeta.label}
                         disabled
                         style={{ paddingLeft: '64px' }} // GUARANTEED Padding
                         className="w-full bg-slate-100/50 border border-transparent rounded-2xl py-4.5 pr-6 text-slate-400 font-medium cursor-not-allowed h-14"
                       />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50 flex items-center justify-end gap-6">
                  {saved && <span className="text-emerald-500 text-sm font-semibold">Saved!</span>}
                  <button 
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 min-w-[180px]"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>

                {/* Android Sync */}
                <div className="pt-16 border-t border-slate-50">
                   <h3 className="text-xl font-semibold text-slate-900 mb-8">Android Call Syncing</h3>
                   <div className="bg-slate-50/50 p-10 rounded-[40px] border border-slate-100">
                      {!user.callSyncToken ? (
                        <button onClick={handleGenerateSyncToken} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-3 mx-auto">
                          <Link2 size={18} /> Activate Sync
                        </button>
                      ) : (
                        <div className="space-y-10">
                           <div className="space-y-4">
                             <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Your Personal Webhook URL</label>
                             <div className="flex flex-col sm:flex-row gap-3">
                               <div className="flex-1 bg-white border border-slate-200 rounded-2xl px-6 py-4 text-[12px] font-mono text-slate-500 overflow-hidden text-ellipsis shadow-sm">
                                 {syncUrl}
                               </div>
                               <button 
                                 onClick={copySyncToClipboard}
                                 className={`px-8 py-4 rounded-2xl text-white font-bold transition-all flex items-center justify-center gap-2 ${syncCopied ? 'bg-emerald-500' : 'bg-blue-600'}`}
                               >
                                 {syncCopied ? <Check size={18} /> : <Copy size={18} />}
                                 {syncCopied ? 'Copied' : 'Copy'}
                               </button>
                             </div>
                           </div>
                           
                           {/* Step Guide with proper spacing */}
                           <div className="p-8 bg-white/50 border border-slate-100 rounded-3xl space-y-6">
                              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-4">Setup Guide</p>
                              {[
                                { s: '1', t: 'Install App', d: 'Download MacroDroid from Play Store.' },
                                { s: '2', t: 'Integration', d: 'Import our sync file into the app.' },
                                { s: '3', t: 'Finish', d: 'Calls will now sync to the CRM automatically.' }
                              ].map(step => (
                                <div key={step.s} className="flex gap-4 items-start">
                                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{step.s}</div>
                                  <div>
                                    <h5 className="font-bold text-slate-800 text-sm leading-none mb-1">{step.t}</h5>
                                    <p className="text-xs text-slate-400 font-medium">{step.d}</p>
                                  </div>
                                </div>
                              ))}
                           </div>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <style>{` .no-scrollbar::-webkit-scrollbar { display: none; } `}</style>
    </div>
  );
}
