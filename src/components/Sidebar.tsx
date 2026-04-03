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
    padding: '0 16px',
    marginBottom: 8,
    marginTop: 8,
    fontSize: 11,
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.14em',
    color: '#a0aec0',
  };

  return (
    <aside className="sidebar select-none">
      {/* ── Brand Header ── */}
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div 
          className="flex items-center gap-3 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onToggle}
          title={isCollapsed ? "Expand Sidebar" : ""}
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-md shadow-indigo-100 flex items-center justify-center flex-shrink-0 animate-slide-in">
            <Activity size={16} color="#fff" strokeWidth={3} />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 animate-fade-in">
              <p className="text-sm font-black text-gray-900 tracking-tighter uppercase whitespace-nowrap">DealByte CRM</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mt-0.5 truncate max-w-[120px]">
                {isSuperAdmin ? 'Platform Admin' : (organization?.name || 'Unified Workspace')}
              </p>
            </div>
          )}
        </div>

        {/* Global Sidebar Toggle Button (Only on larger screens or specifically requested) */}
        {!isCollapsed && (
           <button 
             onClick={onToggle}
             className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors hidden lg:block"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
             </svg>
           </button>
        )}
      </div>


      {/* ── Navigation ── */}
      <nav className="flex-1 pt-6 space-y-8">
        {/* CRM Navigation */}
        {showCrmNav && (
          <div>
            {!isCollapsed && <p style={sectionLabel}>Control Center</p>}
            <div className={`px-3 space-y-1.5 ${isCollapsed ? 'flex flex-col items-center px-0' : ''}`}>
              {CRM_NAV.filter(item => !(isSalesAgent && item.href === '/reports')).map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  title={isCollapsed ? label : ''}
                  className={`flex items-center gap-3.5 rounded-xl font-bold transition-all duration-300 ${isCollapsed ? 'w-11 h-11 justify-center p-0' : 'px-4 py-3.5 text-[15px]'} ${isActive(href) ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 group'}`}
                >
                  <Icon size={isCollapsed ? 20 : 19} className={isActive(href) ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600 transition-colors'} />
                  {!isCollapsed && <span className="animate-fade-in">{label}</span>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Administration */}
        {showAdminSection && (
          <div>
            {!isCollapsed && <p style={sectionLabel}>Platform</p>}
            <div className={`px-3 space-y-2 ${isCollapsed ? 'flex flex-col items-center px-0' : ''}`}>
              
              {isOrgAdmin && (
                 <Link href="/users" title={isCollapsed ? 'Team Members' : ''} className={`flex items-center gap-3 rounded-xl text-sm font-bold transition-all duration-300 ${isCollapsed ? 'w-10 h-10 justify-center p-0' : 'px-4 py-3'} ${isActive('/users') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900 group'}`}>
                   <UserCog size={isCollapsed ? 20 : 18} className={isActive('/users') ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600 transition-colors'} />
                   {!isCollapsed && <span>Team</span>}
                 </Link>
              )}

              {/* Organizations (Super Admin only expansion) */}
              {isSuperAdmin && !isCollapsed && (
                <div>
                   <button 
                     onClick={() => setIsOrgsOpen(!isOrgsOpen)}
                     className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${isOrgsOpen ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900 group'}`}
                   >
                      <div className="flex items-center gap-3">
                        <Building2 size={18} className={isOrgsOpen ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600 transition-colors'} />
                        <span>Organizations</span>
                      </div>
                      <ChevronDown size={16} className={`transition-transform duration-300 ${isOrgsOpen ? 'rotate-180 text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'}`} />
                   </button>
                   {isOrgsOpen && (
                     <div className="mt-1.5 ml-6 space-y-1.5 border-l-2 border-indigo-100 pl-3 animate-slide-down">
                       <Link href="/super-admin?tab=all" className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs font-bold transition-colors ${currentTab === 'all' || (!currentTab && pathname === '/super-admin') ? 'text-indigo-700 bg-indigo-50/50' : 'text-gray-500 hover:text-indigo-600 hover:bg-gray-50'}`}>
                         <span>All</span>
                         <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] select-none">{counts.all}</span>
                       </Link>
                       <Link href="/super-admin?tab=active" className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs font-bold transition-colors ${currentTab === 'active' ? 'text-emerald-700 bg-emerald-50/50' : 'text-gray-500 hover:text-emerald-600 hover:bg-gray-50'}`}>
                         <span>Active</span>
                         <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] select-none">{counts.active}</span>
                       </Link>
                       <Link href="/super-admin?tab=pending" className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs font-bold transition-colors ${currentTab === 'pending' ? 'text-amber-700 bg-amber-50/50' : 'text-gray-500 hover:text-amber-600 hover:bg-gray-50'}`}>
                         <span>Pending</span>
                         <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[10px] select-none">{counts.pending}</span>
                       </Link>
                     </div>
                   )}
                </div>
              )}
              {isSuperAdmin && isCollapsed && (
                 <Link href="/super-admin" title="Organizations" className={`flex items-center gap-3 rounded-xl text-sm font-bold transition-all duration-300 w-10 h-10 justify-center p-0 ${isActive('/super-admin') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900 group'}`}>
                   <Building2 size={20} className={isActive('/super-admin') ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600 transition-colors'} />
                 </Link>
              )}

              {/* Settings */}
              <Link href="/settings" title={isCollapsed ? 'Settings' : ''} className={`flex items-center gap-3 rounded-xl text-sm font-bold transition-all duration-300 ${isCollapsed ? 'w-10 h-10 justify-center p-0' : 'px-4 py-3'} ${isActive('/settings') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900 group'}`}>
                <Settings size={isCollapsed ? 20 : 18} className={isActive('/settings') ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600 transition-colors'} />
                {!isCollapsed && <span>Settings</span>}
              </Link>
            </div>
          </div>
        )}

        {/* Global Action: Logout */}
        <div className={`px-3 pt-4 ${isCollapsed ? 'flex flex-col items-center px-0' : ''}`}>
          <button
            onClick={logout}
            title={isCollapsed ? "Sign Out" : ""}
            className={`flex items-center gap-3.5 rounded-xl font-bold transition-all duration-300 bg-red-50/60 text-red-500 hover:bg-red-500 hover:text-white group ${isCollapsed ? 'w-10 h-10 justify-center p-0' : 'px-4 py-3.5 text-[14px] w-full'}`}
          >
            <LogOut size={isCollapsed ? 20 : 18} className="group-hover:rotate-12 transition-transform" />
            {!isCollapsed && <span className="uppercase tracking-wider font-black">Sign Out</span>}
          </button>
        </div>
      </nav>

      {/* ── User Footer ── */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/30">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-2 bg-white rounded-2xl border border-gray-100 shadow-sm mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-inner overflow-hidden">
               {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-black text-gray-900 truncate uppercase mt-0.5">{user?.name}</p>
               <div className="flex items-center gap-1">
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{roleMeta.label}</span>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg ring-2 ring-white">
               {user?.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .sidebar { height: 100vh; overflow: hidden; display: flex; flexDirection: column; }
      `}</style>
    </aside>
  );
}
