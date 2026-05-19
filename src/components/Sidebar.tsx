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
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/leads',       label: 'Leads',        icon: Users },
  { href: '/activities',  label: 'Timeline',     icon: Activity },
  { href: '/calls',       label: 'Call History', icon: Phone },
  { href: '/tasks',       label: 'Tasks',        icon: CheckSquare },
  { href: '/deals',       label: 'Pipeline',     icon: TrendingUp },
  { href: '/reports',     label: 'Reports',      icon: BarChart2 },
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
  onsite_visitor: { label: 'Onsite Visitor', icon: UserCircle,  color: '#0ea5e9', bg: '#f0f9ff' },
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
  const isOnsiteVisitor = role === 'onsite_visitor';

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
  const showAdminSection = (isOrgAdmin || isManager || isSuperAdmin || isSalesAgent);

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
    <aside className={`sidebar select-none transition-all duration-300 ${isSuperAdmin ? 'bg-gradient-to-b from-white to-[#f8fafc] border-r border-[#e2e8f0]' : 'bg-white border-r border-gray-100'} shadow-sm flex flex-col`}>
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
              <p className="text-sm font-bold text-gray-900 tracking-tight uppercase leading-none">R-Life CRM</p>
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
              {CRM_NAV.filter(item => {
                if (isOnsiteVisitor) return item.href === '/leads' || item.href === '/dashboard';
                if (isSalesAgent && item.href === '/reports') return false;
                return true;
              }).map(({ href, label, icon: Icon }) => {
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

        {/* Super Admin: 3 direct org tabs only */}
        {isSuperAdmin && (
          <div className="mb-8">
            {!isCollapsed && (
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#94a3b8] mb-3 px-6 mt-4">Organizations</p>
            )}
            <div className={`px-4 space-y-2 ${isCollapsed ? 'flex flex-col items-center px-0' : ''}`}>
              {([
                { tab: 'pending', label: 'Pending Approval', icon: Clock,         count: counts.pending },
                { tab: 'active',  label: 'Active',           icon: CheckCircle,   count: counts.active  },
                { tab: 'all',     label: 'All Organizations', icon: Building2,    count: counts.all     },
              ] as const).map(({ tab, label, icon: Icon, count }) => {
                const active = pathname === '/super-admin' && (currentTab === tab || (!currentTab && tab === 'pending'));
                return (
                  <Link
                    key={tab}
                    href={`/super-admin?tab=${tab}`}
                    title={isCollapsed ? label : ''}
                    className={`flex items-center gap-3 rounded-2xl transition-all duration-200 border-2 ${
                      isCollapsed ? 'w-12 h-12 justify-center p-0' : 'px-4 py-3'
                    } ${
                      active
                        ? 'bg-blue-50/50 border-blue-200 text-blue-600 shadow-sm'
                        : 'bg-transparent border-transparent text-gray-500 hover:bg-gray-50 group'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      active ? 'bg-blue-600 shadow-md shadow-blue-100' : 'bg-gray-100 group-hover:bg-indigo-50'
                    }`}>
                      <Icon size={isCollapsed ? 20 : 18} className={active ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} />
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center justify-between flex-1 min-w-0 animate-fade-in">
                        <span className="text-sm font-bold tracking-tight truncate">{label}</span>
                        {count > 0 && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                            active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                          }`}>{count}</span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Administration Section (non-super-admin only) */}
        {!isSuperAdmin && showAdminSection && (
          <div className="mb-8">
            {!isCollapsed && (
              <p style={sectionLabel}>{isSalesAgent ? 'Account' : 'Control Center'}</p>
            )}
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
            </div>
          </div>
        )}
      </nav>

      {/* ── Action Footer ── */}
      <div className={`p-4 border-t ${isSuperAdmin ? 'border-[#e2e8f0] bg-white/50' : 'border-gray-100 bg-white'}`}>
        <button 
          onClick={logout}
          title="Sign Out"
          className={`w-full flex items-center gap-3 rounded-2xl transition-all duration-200 border-2 items-center group ${isCollapsed ? 'justify-center p-0 border-transparent text-gray-500 hover:bg-red-50 hover:text-red-500 h-12 w-12 mx-auto' : 'px-4 py-3 border-transparent text-gray-500 hover:bg-red-50 hover:text-red-600'}`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isCollapsed ? '' : 'bg-gray-100 group-hover:bg-red-100'}`}>
            <LogOut size={isCollapsed ? 20 : 18} className="group-hover:text-red-500 transition-colors" />
          </div>
          {!isCollapsed && <span className="text-sm font-bold tracking-tight animate-fade-in group-hover:text-red-600 transition-colors">Sign Out</span>}
        </button>
      </div>

      <style jsx>{`
        .sidebar { height: 100%; overflow: hidden; display: flex; flexDirection: column; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </aside>
  );
}
