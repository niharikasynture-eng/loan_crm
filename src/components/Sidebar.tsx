'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LayoutDashboard, Users, Phone, CheckSquare, TrendingUp,
  Settings, LogOut, ChevronDown, Building2, BarChart2,
  Activity, Bell, Link2, Clock, CheckCircle, AlertCircle,
  UserCog, ShieldCheck, Briefcase, UserCircle,
} from 'lucide-react';

interface Notification {
  _id: string; title: string; message: string; read: boolean; link?: string; createdAt: string;
}

const CRM_NAV = [
  { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/leads',       label: 'Leads',      icon: Users },
  { href: '/activities',  label: 'Activities', icon: Phone },
  { href: '/tasks',       label: 'Tasks',      icon: CheckSquare },
  { href: '/deals',       label: 'Pipeline',   icon: TrendingUp },
  { href: '/reports',     label: 'Reports',    icon: BarChart2 },
];

const ADMIN_NAV = [
  { href: '/users',    label: 'Team Members', icon: UserCog },
  { href: '/settings', label: 'Settings',     icon: Settings },
];

const ROLE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  super_admin:  { label: 'Super Admin',  icon: ShieldCheck, color: '#7c3aed', bg: '#f3f0ff' },
  org_admin:    { label: 'Org Admin',    icon: Briefcase,   color: '#1a73e8', bg: '#e8f0fe' },
  manager:      { label: 'Manager',      icon: UserCog,     color: '#0f9d58', bg: '#e6f4ea' },
  sales_agent:  { label: 'Sales Person', icon: UserCircle,  color: '#f29900', bg: '#fef7e0' },
};

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const { user, organization, logout, token } = useAuth();

  const [counts, setCounts]               = useState({ pending: 0, active: 0, all: 0 });
  const [isOrgsOpen, setIsOrgsOpen]       = useState(pathname.startsWith('/super-admin'));

  useEffect(() => {
    if (pathname.startsWith('/super-admin')) setIsOrgsOpen(true);
  }, [pathname]);

  const role         = user?.role ?? 'sales_agent';
  const isSuperAdmin = role === 'super_admin';
  const isOrgAdmin   = role === 'org_admin';
  const isManager    = role === 'manager';
  const isSalesAgent = role === 'sales_agent';

  const roleMeta = ROLE_META[role] ?? ROLE_META['sales_agent'];
  const RoleIcon = roleMeta.icon;


  const loadCounts = useCallback(async () => {
    if (!token || !isSuperAdmin) return;
    try {
      const res  = await fetch('/api/admin/organizations?summary=true', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const orgs = data.organizations || [];
      setCounts({
        pending: orgs.filter((o: any) => o.status === 'pending').length,
        active:  orgs.filter((o: any) => o.status === 'active' || o.status === 'approved').length,
        all:     orgs.filter((o: any) => o.status !== 'deleted').length,
      });
    } catch {}
  }, [token, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) loadCounts();
    const interval = setInterval(() => { if (isSuperAdmin) loadCounts(); }, 60000);
    return () => clearInterval(interval);
  }, [loadCounts, isSuperAdmin]);


  const currentTab = searchParams.get('tab');
  const isActive   = (href: string, tab?: string) => {
    if (tab) return pathname === href && currentTab === tab;
    return pathname === href || (pathname.startsWith(href + '/') && !pathname.includes('super-admin'));
  };

  const showCrmNav      = !isSuperAdmin;
  const showAdminSection = (isOrgAdmin || isManager || isSuperAdmin);

  // Sidebar section label style
  const sectionLabel: React.CSSProperties = {
    padding: '0 24px',
    marginBottom: 8,
    marginTop: 24,
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    color: '#94a3b8',
  };

  return (
    <aside className="sidebar select-none bg-white border-r border-gray-100 shadow-sm flex flex-col">
      {/* ── Brand Header ── */}
      <div className="flex items-center justify-between p-6 border-b border-gray-50">
        <div 
          className="flex items-center gap-3 overflow-hidden cursor-pointer group"
          onClick={onToggle}
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
            <Activity size={18} color="#fff" strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-sm font-bold text-gray-900 tracking-tight uppercase leading-none">DealByte CRM</p>
              <p className="text-[10px] font-medium text-gray-400 mt-1 truncate">
                {isSuperAdmin ? 'Platform Admin' : (organization?.name || 'Synture Solutions')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-6">
        {/* CRM Navigation */}
        {showCrmNav && (
          <div className="mb-8">
            {!isCollapsed && <p style={sectionLabel}>Control Center</p>}
            <div className={`px-4 space-y-2 ${isCollapsed ? 'flex flex-col items-center px-0' : ''}`}>
              {CRM_NAV.filter(item => !(isSalesAgent && item.href === '/reports')).map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    title={isCollapsed ? label : ''}
                    className={`flex items-center gap-3 rounded-2xl transition-all duration-200 border-2 ${isCollapsed ? 'w-12 h-12 justify-center p-0' : 'px-4 py-3'} ${active ? 'bg-blue-50/50 border-blue-200 text-blue-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 group'}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-blue-600 shadow-md shadow-blue-100' : 'bg-gray-100 group-hover:bg-indigo-50'}`}>
                      <Icon size={isCollapsed ? 20 : 18} className={active ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} />
                    </div>
                    {!isCollapsed && <span className="text-sm font-bold tracking-tight animate-fade-in">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Administration Section */}
        {showAdminSection && (
          <div className="mb-8">
            {!isCollapsed && <p style={sectionLabel}>Platform</p>}
            <div className={`px-4 space-y-2 ${isCollapsed ? 'flex flex-col items-center px-0' : ''}`}>
              
              {isOrgAdmin && (
                <Link 
                  href="/users" 
                  title={isCollapsed ? 'Team Members' : ''} 
                  className={`flex items-center gap-3 rounded-2xl transition-all duration-200 border-2 ${isCollapsed ? 'w-12 h-12 justify-center p-0' : 'px-4 py-3'} ${isActive('/users') ? 'bg-blue-50/50 border-blue-200 text-blue-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 group'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isActive('/users') ? 'bg-blue-600 shadow-md shadow-blue-100' : 'bg-gray-100 group-hover:bg-indigo-50'}`}>
                    <UserCog size={isCollapsed ? 20 : 18} className={isActive('/users') ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} />
                  </div>
                  {!isCollapsed && <span className="text-sm font-bold tracking-tight animate-fade-in">Team</span>}
                </Link>
              )}

              {/* Settings */}
              <Link 
                href="/settings" 
                title={isCollapsed ? 'Settings' : ''} 
                className={`flex items-center gap-3 rounded-2xl transition-all duration-200 border-2 ${isCollapsed ? 'w-12 h-12 justify-center p-0' : 'px-4 py-3'} ${isActive('/settings') ? 'bg-blue-50/50 border-blue-200 text-blue-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 group'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isActive('/settings') ? 'bg-blue-600 shadow-md shadow-blue-100' : 'bg-gray-100 group-hover:bg-indigo-50'}`}>
                  <Settings size={isCollapsed ? 20 : 18} className={isActive('/settings') ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} />
                </div>
                {!isCollapsed && <span className="text-sm font-bold tracking-tight animate-fade-in">Settings</span>}
              </Link>

              {/* Organizations (Super Admin only expansion) */}
              {isSuperAdmin && !isCollapsed && (
                <div className="pt-2">
                   <button 
                     onClick={() => setIsOrgsOpen(!isOrgsOpen)}
                     className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all border-2 ${isOrgsOpen ? 'bg-indigo-50/30 border-indigo-100 text-indigo-700' : 'border-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-900 group'}`}
                   >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isOrgsOpen ? 'bg-indigo-600 shadow-md shadow-indigo-100' : 'bg-gray-100 group-hover:bg-indigo-50'}`}>
                          <Building2 size={18} className={isOrgsOpen ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} />
                        </div>
                        <span>Organizations</span>
                      </div>
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isOrgsOpen ? 'rotate-180 text-indigo-600' : 'text-gray-400'}`} />
                   </button>
                   {isOrgsOpen && (
                     <div className="mt-2 ml-10 space-y-1 border-l-2 border-indigo-100 pl-4 animate-slide-down">
                       <Link href="/super-admin?tab=all" className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs font-bold transition-colors ${currentTab === 'all' || (!currentTab && pathname === '/super-admin') ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}>
                         <span>All</span>
                         <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px]">{counts.all}</span>
                       </Link>
                       <Link href="/super-admin?tab=active" className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs font-bold transition-colors ${currentTab === 'active' ? 'text-emerald-700 bg-emerald-50/50' : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'}`}>
                         <span>Active</span>
                         <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px]">{counts.active}</span>
                       </Link>
                       <Link href="/super-admin?tab=pending" className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs font-bold transition-colors ${currentTab === 'pending' ? 'text-amber-700 bg-amber-50/50' : 'text-gray-500 hover:text-amber-600 hover:bg-gray-50'}`}>
                         <span>Pending</span>
                         <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px]">{counts.pending}</span>
                       </Link>
                     </div>
                   )}
                </div>
              )}
              {isSuperAdmin && isCollapsed && (
                 <Link href="/super-admin" title="Organizations" className={`flex items-center gap-3 rounded-2xl transition-all duration-200 border-2 ${isCollapsed ? 'w-12 h-12 justify-center p-0' : 'px-4 py-3'} ${isActive('/super-admin') ? 'bg-blue-50/50 border-blue-200 text-blue-600 shadow-sm' : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 group'}`}>
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isActive('/super-admin') ? 'bg-blue-600 shadow-md shadow-blue-100' : 'bg-gray-100 group-hover:bg-indigo-50'}`}>
                     <Building2 size={20} className={isActive('/super-admin') ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} />
                   </div>
                 </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── User Footer ── */}
      <div className="p-4 border-t border-gray-100 bg-white">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-transparent hover:border-gray-50 transition-all">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white ring-1 ring-gray-100 overflow-hidden flex-shrink-0">
               {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm font-bold text-gray-900 truncate leading-tight uppercase tracking-tight">{user?.name || 'Mayur S'}</p>
               <span className="inline-flex mt-1 items-center px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 text-blue-600 uppercase tracking-widest leading-none">
                 {roleMeta.label}
               </span>
            </div>
            <button 
              onClick={logout}
              title="Sign Out"
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white">
               {user?.name?.charAt(0).toUpperCase()}
            </div>
            <button onClick={logout} className="p-2 text-gray-400 hover:text-red-500">
               <LogOut size={18} />
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .sidebar { height: 100vh; overflow: hidden; display: flex; flexDirection: column; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </aside>
  );
}
